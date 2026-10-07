import { getParams, getSupabase, json, normalizeEmail, normalizePhone, preflight, withErrors } from "@/lib/server"

export const GET = withErrors(async (request) => {
  const { checkout_id, phone: rawPhone, email: rawEmail } = await getParams(request)
  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)

  const supabase = getSupabase()
  let query = supabase.from("licenses").select("*")

  if (checkout_id) {
    query = query.eq("checkout_id", checkout_id)
  } else if (phone && email) {
    query = query.or(`phone.eq.${phone},email.eq.${email}`)
  } else if (phone) {
    query = query.eq("phone", phone)
  } else if (email) {
    query = query.eq("email", email)
  } else {
    return json({ error: "Missing lookup identifier" }, 400)
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

  if (error || !data) {
    return json({ found: false, paid: false, status: "pending" })
  }

  const isPaid = Boolean(data.paid || data.status === "active" || data.license || data.license_key)

  return json({
    found: true,
    paid: isPaid,
    status: data.status || (isPaid ? "active" : "pending"),
    license: data.license_key || data.license || null,
    expiry: data.expiry || null,
    activation_type: data.activation_type || "تلقائي",
    plan: data.purchase_type || data.plan || "first",
  })
})

export const POST = GET
export const OPTIONS = preflight
