import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { timingSafeEqual } from "node:crypto"
import { PLANS, type PlanKey } from "@/lib/plans"

export const CHARGILY_API = "https://pay.chargily.net/api/v2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
}

let supabaseClient: SupabaseClient | undefined

export function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY must be set")
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

export function isValidMachineId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_\-:.]{4,128}$/.test(id)
}

export function parsePlan(plan: unknown): PlanKey | null {
  const key = String(plan ?? "").toUpperCase()
  return key in PLANS ? (key as PlanKey) : null
}

export function computeExpiry(plan: PlanKey, days?: number | null, from?: string | null) {
  const duration = days ?? PLANS[plan].days
  if (duration === null) return "LIFETIME"
  const now = new Date()
  const base = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00Z`) : now
  const date = base > now ? base : now
  date.setUTCDate(date.getUTCDate() + Number(duration))
  return date.toISOString().slice(0, 10)
}

export async function getLatestLicense(machineId: string) {
  const { data, error } = await getSupabase()
    .from("licenses")
    .select("license, plan, expiry, created_at")
    .eq("machine_id", machineId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as { license: string; plan: string; expiry: string; created_at: string } | null
}

export function buildLicense(machineId: string, expiry: string, plan: PlanKey) {
  return Buffer.from(`${machineId}|${expiry}|${plan}`, "utf8").toString("base64")
}

export function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/[\s\-().]/g, "")
  const local = digits.startsWith("+213") ? `0${digits.slice(4)}` : digits.startsWith("00213") ? `0${digits.slice(5)}` : digits
  return /^0[567]\d{8}$/.test(local) ? local : null
}

export async function getLatestLicenseByPhone(phone: string) {
  const { data, error } = await getSupabase()
    .from("licenses")
    .select("license, plan, expiry, created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as { license: string; plan: string; expiry: string; created_at: string } | null
}

type ChargilyCheckout = {
  id: string
  status: string
  amount: number
  metadata?: { phone?: string; plan?: string } | null
}

export async function fetchChargilyCheckout(checkoutId: string): Promise<ChargilyCheckout | null> {
  const secretKey = process.env.CHARGILY_SECRET_KEY
  if (!secretKey) throw new Error("CHARGILY_SECRET_KEY is not configured")
  const response = await fetch(`${CHARGILY_API}/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!response.ok) return null
  return response.json()
}

export async function fulfillCheckout(checkout: ChargilyCheckout) {
  if (checkout.status !== "paid") return { ok: false as const, reason: "not_paid" }

  const phone = normalizePhone(checkout.metadata?.phone)
  const planKey = parsePlan(checkout.metadata?.plan)
  if (!phone || !planKey) return { ok: false as const, reason: "invalid_metadata" }

  const supabase = getSupabase()
  const { data: existing, error: existingError } = await supabase
    .from("licenses")
    .select("id")
    .eq("checkout_id", checkout.id)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return { ok: true as const, phone }

  const previous = planKey === "FULL" ? null : await getLatestLicenseByPhone(phone)
  const expiry = computeExpiry(planKey, null, previous?.expiry)
  const license = buildLicense(phone, expiry, planKey)

  const { error } = await supabase.from("licenses").insert({
    phone,
    plan: planKey,
    expiry,
    license,
    checkout_id: checkout.id,
    amount: checkout.amount,
    created_at: new Date().toISOString(),
  })
  if (error && error.code !== "23505") throw error

  return { ok: true as const, phone }
}

export function isAdmin(request: Request) {
  const expected = process.env.ADMIN_TOKEN
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!expected || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function withErrors(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request)
    } catch (err) {
      console.error("[api] error:", err)
      const message = err instanceof Error ? err.message : "Internal server error"
      return json({ error: message }, 500)
    }
  }
}
