import { PLANS, normalizePlanType } from "@/lib/plans"
import {
  CHARGILY_TEST_API,
  getParams,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
  withErrors,
} from "@/lib/server"

export const POST = withErrors(async (request) => {
  const secretKey = process.env.CHARGILY_SECRET_KEY
  if (!secretKey) {
    return json({ error: "CHARGILY_SECRET_KEY is not configured on server" }, 500)
  }

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

  // Origin for callback redirection
  const appUrl =
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

  // Use Chargily Test API endpoint: https://pay.chargily.dz/test/api/v2/checkouts
  const chargilyEndpoint = `${CHARGILY_TEST_API}/checkouts`

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
    console.error("[create-checkout] Chargily API error:", data)
    return json(
      {
        error: data.message || "تعذر إنشاء جلسة الدفع مع Chargily Pay",
        details: data,
      },
      response.status || 500
    )
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
