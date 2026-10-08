import { createHmac, timingSafeEqual } from "node:crypto"
import { PLANS, normalizePlanType } from "@/lib/plans"
import {
  computeExpiry,
  findCustomerLicense,
  getChargilySecretKey,
  getSupabase,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
} from "@/lib/server"
import { generateOtr1License } from "@/lib/license"

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const chargilySecret = getChargilySecretKey()
    if (!chargilySecret) {
      console.error("[webhook] CHARGILY_SECRET_KEY not set")
      return json({ error: "Server misconfigured: CHARGILY_SECRET_KEY missing" }, 500)
    }

    const rawBody = await request.text()
    const signature = request.headers.get("signature") ?? ""

    const isTestMode = chargilySecret.startsWith("test_") || process.env.CHARGILY_MODE === "test"
    // In production Chargily provides signature header; in test mode we allow test requests or valid signature
    if (signature && !isValidSignature(rawBody, signature, chargilySecret) && !isTestMode) {
      console.warn("[webhook] Invalid signature from Chargily")
      return json({ error: "Invalid signature" }, 403)
    }

    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return json({ error: "Invalid JSON body" }, 400)
    }

    // Determine if event represents paid checkout
    const isPaidEvent =
      event?.type === "checkout.paid" ||
      event?.data?.status === "paid" ||
      event?.status === "paid"

    if (!isPaidEvent) {
      return json({ success: true, message: "Event ignored (not paid)" })
    }

    const checkoutData = event.data || event
    const metadata = checkoutData.metadata || {}

    const phone = normalizePhone(metadata.phone || checkoutData.customer_phone || "")
    const email = normalizeEmail(metadata.email || checkoutData.customer_email || "")
    const planType = normalizePlanType(metadata.type || metadata.plan || "first")
    const amount = Number(checkoutData.amount || metadata.amount || PLANS[planType].amount)
    const checkoutId = checkoutData.id ? String(checkoutData.id) : null

    const supabase = getSupabase()

    // Deduplication check
    if (checkoutId) {
      const { data: existing } = await supabase
        .from("licenses")
        .select("id, license, license_key")
        .eq("checkout_id", checkoutId)
        .maybeSingle()

      if (existing) {
        return json({ success: true, message: "Checkout already processed" })
      }
    }

    // Check previous license to calculate expiry
    const customer = await findCustomerLicense(phone, email)
    const previousExpiry = customer?.active?.expiry || null

    const expiry = computeExpiry(planType, null, previousExpiry)
    const licenseKey = generateOtr1License({
      customerPhone: phone || undefined,
      customerEmail: email || undefined,
      plan: planType,
      machineId: phone || undefined,
    })

    const newRecord: Record<string, any> = {
      phone: phone || null,
      email: email || null,
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
      customer_name: email || phone || "Otouri User",
      created_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase.from("licenses").insert(newRecord)

    if (insertError && insertError.code !== "23505") {
      console.error("[webhook] Supabase insert error:", insertError)
      // Fallback with minimal columns in case table has differing structure
      try {
        await supabase.from("licenses").insert({
          phone: phone || null,
          plan: PLANS[planType].key,
          license: licenseKey,
          amount,
          checkout_id: checkoutId,
          created_at: new Date().toISOString(),
        })
      } catch {
        // ignore
      }
    }

    console.log(`[webhook] Successfully activated automatic license for ${phone || email} (${planType})`)
    return json({ success: true, license_key: licenseKey, expiry, plan: planType })
  } catch (err) {
    console.error("[webhook] Exception:", err)
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500)
  }
}

export const OPTIONS = preflight
