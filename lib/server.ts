import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { timingSafeEqual } from "node:crypto"
import { PLANS, normalizePlanType, type PlanType } from "@/lib/plans"
import { generateOtr1License } from "@/lib/license"

// Chargily Test Mode API Base URL as specified
export const CHARGILY_TEST_API = "https://pay.chargily.dz/test/api/v2"
export const CHARGILY_LIVE_API = "https://pay.chargily.net/api/v2"

export function getChargilyApiUrl(): string {
  const secretKey = process.env.CHARGILY_SECRET_KEY || ""
  if (secretKey.startsWith("test_") || process.env.CHARGILY_MODE === "test" || !process.env.CHARGILY_MODE) {
    return CHARGILY_TEST_API
  }
  return CHARGILY_LIVE_API
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, signature",
  "Access-Control-Max-Age": "86400",
}

let supabaseClient: SupabaseClient | undefined

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY must be set")
    }
    supabaseClient = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabaseClient
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function getParams(request: Request): Promise<Record<string, any>> {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams)
  }
  try {
    const body = await request.json()
    return body && typeof body === "object" ? body : {}
  } catch {
    return {}
  }
}

export function normalizePhone(value: unknown): string | null {
  if (!value) return null
  const digits = String(value).replace(/[\s\-().]/g, "").trim()
  const local = digits.startsWith("+213")
    ? `0${digits.slice(4)}`
    : digits.startsWith("00213")
    ? `0${digits.slice(5)}`
    : digits
  return /^0[567]\d{8}$/.test(local) ? local : digits.length >= 9 ? local : null
}

export function normalizeEmail(value: unknown): string | null {
  if (!value) return null
  const email = String(value).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function isValidMachineId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_\-:.]{4,128}$/.test(id)
}

export function computeExpiry(type: PlanType, daysOverride?: number | null, fromDateStr?: string | null): string {
  const duration = daysOverride ?? PLANS[type]?.days ?? 30
  const now = new Date()
  let base = now

  if (fromDateStr) {
    const parsed = new Date(fromDateStr)
    if (!isNaN(parsed.getTime()) && parsed > now) {
      base = parsed // Extend existing active duration
    }
  }

  const targetDate = new Date(base.getTime())
  targetDate.setDate(targetDate.getDate() + Number(duration))
  return targetDate.toISOString()
}

export async function findCustomerLicense(phone?: string | null, email?: string | null) {
  try {
    const supabase = getSupabase()
    let query = supabase.from("licenses").select("*")

    if (phone && email) {
      query = query.or(`phone.eq.${phone},email.eq.${email}`)
    } else if (phone) {
      query = query.eq("phone", phone)
    } else if (email) {
      query = query.eq("email", email)
    } else {
      return null
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(5)
    if (error || !data || data.length === 0) return null

    // Find the most recent active or first license
    const activeLicense = data.find((row) => {
      if (row.revoked) return false
      if (row.status === "pending") return false
      if (!row.expiry) return true
      return new Date(row.expiry).getTime() > Date.now()
    })

    const hadAnyLicense = data.some((row) => row.status !== "pending" && (row.paid || row.activation_type === "يدوي" || row.license))

    return {
      latest: data[0],
      active: activeLicense || null,
      hadPriorLicense: hadAnyLicense,
      all: data,
    }
  } catch (err) {
    console.error("[findCustomerLicense] error:", err)
    return null
  }
}

export async function fulfillPaidCheckout({
  checkoutId,
  phone,
  email,
  planType,
  amount,
}: {
  checkoutId: string
  phone: string
  email: string
  planType: PlanType
  amount: number
}) {
  const supabase = getSupabase()

  // 1. Check if checkout was already fulfilled
  if (checkoutId) {
    const { data: existing } = await supabase
      .from("licenses")
      .select("id, license, license_key, expiry")
      .eq("checkout_id", checkoutId)
      .maybeSingle()

    if (existing && existing.license) {
      return { ok: true, license: existing.license_key || existing.license }
    }
  }

  // 2. Check previous customer expiry to extend if active
  const customerInfo = await findCustomerLicense(phone, email)
  const previousExpiry = customerInfo?.active?.expiry || null

  const expiry = computeExpiry(planType, null, previousExpiry)
  const licenseKey = generateOtr1License({
    customerPhone: phone,
    customerEmail: email,
    plan: planType,
    machineId: phone,
  })

  const payload: Record<string, any> = {
    phone,
    email,
    purchase_type: planType,
    plan: PLANS[planType].key,
    activation_type: "تلقائي",
    status: "active",
    amount,
    expiry,
    license: licenseKey,
    license_key: licenseKey,
    paid: true,
    checkout_id: checkoutId,
    customer_name: email || phone,
    created_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("licenses").insert(payload)
  if (error && error.code !== "23505") {
    console.error("[fulfillPaidCheckout] Insert error:", error)
    // Fallback if some column differs
    await supabase.from("licenses").insert({
      phone,
      plan: PLANS[planType].key,
      license: licenseKey,
      amount,
      checkout_id: checkoutId,
      created_at: new Date().toISOString(),
    }).catch(() => {})
  }

  return { ok: true, license: licenseKey, expiry }
}

export function isAdmin(request: Request): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || "admin123"
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim()

  if (!token) return false

  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expectedPassword)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return token === expectedPassword
  }
}

export function withErrors(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request)
    } catch (err) {
      console.error("[api] Server error:", err)
      const message = err instanceof Error ? err.message : "Internal server error"
      return json({ error: message }, 500)
    }
  }
}
