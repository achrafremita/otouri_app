import { PLANS, normalizePlanType } from "@/lib/plans"
import {
  getChargilyApiUrl,
  getParams,
  getSupabase,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
  withErrors,
} from "@/lib/server"

export const POST = withErrors(async (request) => {
  // 1 & 3: Check secret key with fallbacks and clean spaces/quotes
  const rawSecretKey =
    process.env.CHARGILY_SECRET_KEY ||
    process.env.CHARGILY_API_KEY ||
    process.env.CHARGILY_API_SECRET ||
    ""

  const secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, "")

  if (!secretKey) {
    return json({ error: "CHARGILY_SECRET_KEY is not configured on server" }, 500)
  }

  // 2: Determine live vs test mode and base URL
  const isLive = secretKey.startsWith("live_") || (process.env.CHARGILY_MODE === "live" && !secretKey.startsWith("test_"))
  const modeName = isLive ? "LIVE" : "TEST"
  const chargilyBase = isLive
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2"

  // 4: Log Mode: LIVE or TEST and first 12 chars of key
  console.log(`[create-checkout] Mode: ${modeName}, Key prefix: ${secretKey.slice(0, 12)}...`)

  const {
    phone: rawPhone,
    email: rawEmail,
    type: rawType = "first",
    plan: rawPlan,
    amount: rawAmount,
    success_url: customSuccessUrl,
    failure_url: customFailureUrl,
  } = await getParams(request)

  const planType = normalizePlanType(rawType || rawPlan || "first")
  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)

  if (!phone) {
    return json({ error: "رقم الهاتف مطلوب وغير صحيح. مثال: 0555123456" }, 400)
  }
  if (!email) {
    return json({ error: "البريد الإلكتروني مطلوب وغير صحيح. مثال: user@gmail.com" }, 400)
  }

  const planConfig = PLANS[planType]
  const amount = Number(rawAmount) || planConfig.amount

  // 6: Don't hardcode success_url, use NEXT_PUBLIC_APP_URL or fallback
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://otouri-app.vercel.app"
  const formattedAppUrl = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`

  const success_url = customSuccessUrl || `${formattedAppUrl}/success`
  const failure_url = customFailureUrl || `${formattedAppUrl}/?payment=failed`

  const payload = {
    amount,
    currency: "dzd",
    success_url,
    failure_url,
    locale: "ar",
    description: `Otouri License - ${planConfig.nameAr} (${phone})`,
    metadata: {
      phone,
      email,
      type: planType,
      plan: planConfig.key,
      plan_name: planConfig.nameAr,
      amount,
    },
  }

  const chargilyEndpoint = `${chargilyBase}/checkouts`

  // 5: Use header Authorization: Bearer ${secret}
  const response = await fetch(chargilyEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.checkout_url) {
    console.error("[create-checkout] Chargily API error:", response.status, data)
    return json(
      {
        error: data.message || "تعذر إنشاء جلسة الدفع مع Chargily Pay",
        details: data,
      },
      response.status || 500
    )
  }

  // Record pending checkout session in Supabase
  try {
    const supabase = getSupabase()
    await supabase.from("licenses").insert({
      phone,
      email,
      purchase_type: planType,
      plan: planConfig.key,
      activation_type: "تلقائي",
      status: "pending",
      amount,
      paid: false,
      checkout_id: data.id ? String(data.id) : undefined,
      customer_name: email || phone,
      created_at: new Date().toISOString(),
    })
  } catch (dbErr) {
    console.warn("[create-checkout] Supabase record pending warning:", dbErr)
  }

  return json({
    success: true,
    checkout_id: data.id,
    checkout_url: data.checkout_url,
    amount,
    type: planType,
    plan: planConfig.key,
    phone,
    email,
  })
})

export const OPTIONS = preflight
