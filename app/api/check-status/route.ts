import { findCustomerLicense, getParams, json, normalizeEmail, normalizePhone, preflight, withErrors } from "@/lib/server"

export const GET = withErrors(async (request) => {
  const { phone: rawPhone, email: rawEmail } = await getParams(request)
  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)

  if (!phone && !email) {
    return json({ error: "الرجاء إدخال رقم الهاتف أو البريد الإلكتروني للتحقق" }, 400)
  }

  const result = await findCustomerLicense(phone, email)

  if (!result || !result.hadPriorLicense) {
    return json({
      exists: false,
      had_first_license: false,
      is_expired: false,
      is_active: false,
      status: "new_user",
      message: "مستخدم جديد، مؤهل لشراء النسخة الأولى",
    })
  }

  const active = result.active
  const latest = result.latest
  const now = Date.now()

  const expiryTime = latest?.expiry ? new Date(latest.expiry).getTime() : 0
  const isExpired = !active || (expiryTime > 0 && expiryTime <= now)

  return json({
    exists: true,
    had_first_license: true,
    is_expired: isExpired,
    is_active: !isExpired && !!active,
    status: isExpired ? "expired" : "active",
    plan: latest?.purchase_type || latest?.plan || "first",
    expiry: latest?.expiry || null,
    activation_type: latest?.activation_type || "تلقائي",
    license: latest?.license_key || latest?.license || null,
  })
})

export const POST = GET
export const OPTIONS = preflight
