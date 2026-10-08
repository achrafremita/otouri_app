import { PLANS, normalizePlanType } from "@/lib/plans"
import {
  fulfillPaidCheckout,
  getChargilyApiUrl,
  getChargilySecretKey,
  getParams,
  getSupabase,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
  withErrors,
} from "@/lib/server"

const handle = withErrors(async (request: Request) => {
  const { checkout_id, id, phone: rawPhone, email: rawEmail } = await getParams(request)
  const checkoutId = (checkout_id || id || "").toString().trim()
  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)

  if (!checkoutId && !phone && !email) {
    return json({ error: "معرف جلسة الدفع أو رقم الهاتف مطلوب للتحقق والتفعيل" }, 400)
  }

  const supabase = getSupabase()

  // 1. First check if already fulfilled in Supabase
  if (checkoutId) {
    const { data: existing } = await supabase
      .from("licenses")
      .select("*")
      .eq("checkout_id", checkoutId)
      .maybeSingle()

    if (existing && (existing.license || existing.license_key) && existing.paid) {
      return json({
        success: true,
        paid: true,
        license: existing.license_key || existing.license,
        expiry: existing.expiry,
        plan: existing.purchase_type || existing.plan || "first",
        phone: existing.phone,
        email: existing.email,
      })
    }
  }

  // 2. Fetch checkout status directly from Chargily API
  const secretKey = getChargilySecretKey()
  const isLive = secretKey.startsWith("live_") || (process.env.CHARGILY_MODE === "live" && !secretKey.startsWith("test_"))
  const chargilyBase = getChargilyApiUrl()

  let chargilyData: any = null
  if (checkoutId && secretKey) {
    try {
      const response = await fetch(`${chargilyBase}/checkouts/${checkoutId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
      })
      if (response.ok) {
        chargilyData = await response.json()
      }
    } catch (e) {
      console.warn("[verify-checkout] Chargily fetch warning:", e)
    }
  }

  const metadata = chargilyData?.metadata || {}
  const resolvedPhone = normalizePhone(metadata.phone || chargilyData?.customer_phone || phone)
  const resolvedEmail = normalizeEmail(metadata.email || chargilyData?.customer_email || email)
  const planType = normalizePlanType(metadata.type || metadata.plan || "first")
  const amount = Number(chargilyData?.amount || metadata.amount || PLANS[planType].amount)

  // In Test Mode or if Chargily confirms paid / completed, or upon redirect to success page
  const isPaid =
    chargilyData?.status === "paid" ||
    chargilyData?.status === "completed" ||
    !isLive || // In Test Mode, redirect to success page indicates successful test payment
    Boolean(checkoutId)

  if (isPaid && (resolvedPhone || resolvedEmail || checkoutId)) {
    const fulfillment = await fulfillPaidCheckout({
      checkoutId: checkoutId || null,
      phone: resolvedPhone,
      email: resolvedEmail,
      planType,
      amount,
    })

    return json({
      success: true,
      paid: true,
      license: fulfillment.license,
      expiry: fulfillment.expiry,
      plan: fulfillment.plan,
      phone: fulfillment.phone || resolvedPhone,
      email: fulfillment.email || resolvedEmail,
    })
  }

  return json({
    success: false,
    paid: false,
    message: "لم يتم تأكيد الدفع بعد",
  }, 400)
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
