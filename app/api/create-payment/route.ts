import { PLANS } from "@/lib/plans"
import {
  CHARGILY_API,
  getLatestLicenseByPhone,
  getParams,
  json,
  normalizePhone,
  parsePlan,
  preflight,
  withErrors,
} from "@/lib/server"

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export const POST = withErrors(async (request) => {
  const secretKey = process.env.CHARGILY_SECRET_KEY
  if (!secretKey) return json({ error: "CHARGILY_SECRET_KEY is not configured" }, 500)

  const {
    phone: rawPhone,
    plan = "FULL",
    success_url,
    failure_url,
    locale = "ar",
    machine_id,
    mid,
    name,
    customer_name,
  } = await getParams(request)
  const planKey = parsePlan(plan)
  const phone = normalizePhone(rawPhone)
  const machineId = (machine_id || mid || "").toString().trim()
  const customerName = (name || customer_name || "").toString().trim()

  if (!phone) return json({ error: "رقم الهاتف غير صالح. مثال: 0555123456" }, 400)
  if (!planKey) return json({ error: "Invalid plan. Use FULL, MONTHLY or YEARLY" }, 400)
  if (!isHttpUrl(success_url)) return json({ error: "A valid success_url is required" }, 400)

  const isCustomer = Boolean(await getLatestLicenseByPhone(phone))
  if (isCustomer && planKey === "FULL") {
    return json({ error: "هذا الرقم يملك التطبيق بالفعل. يمكنك التجديد من داخل التطبيق." }, 409)
  }
  if (!isCustomer && planKey !== "FULL") {
    return json({ error: "يجب شراء التطبيق أولاً قبل التجديد." }, 409)
  }

  const payload: Record<string, unknown> = {
    amount: PLANS[planKey].amount,
    currency: "dzd",
    success_url,
    locale: ["ar", "en", "fr"].includes(locale) ? locale : "ar",
    description: `License ${planKey}`,
    metadata: {
      phone,
      plan: planKey,
      machine_id: machineId || undefined,
      mid: machineId || undefined,
      name: customerName || undefined,
      customer_name: customerName || undefined,
    },
  }
  if (isHttpUrl(failure_url)) payload.failure_url = failure_url

  const response = await fetch(`${CHARGILY_API}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return json({ error: "Chargily checkout failed", details: data }, response.status)
  }

  return json({
    checkout_id: data.id,
    checkout_url: data.checkout_url,
    amount: payload.amount,
    plan: planKey,
  })
})

export const OPTIONS = preflight
