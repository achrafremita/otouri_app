import { getParams, getSupabase, json, normalizePhone, preflight, withErrors } from "@/lib/server"

const handle = withErrors(async (request) => {
  const { phone: rawPhone, mid, machine_id } = await getParams(request)
  const phone = normalizePhone(rawPhone)
  const machineId = (mid || machine_id || "").toString().trim()

  if (!phone && !machineId) {
    return json({ error: "Missing phone or machine_id" }, 400)
  }

  const supabase = getSupabase()
  let query = supabase
    .from("licenses")
    .select("license, license_key, plan, expiry, created_at, customer_name, paid, machine_id, phone")

  if (machineId) {
    query = query.eq("machine_id", machineId)
  } else if (phone) {
    query = query.eq("phone", phone)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return json({ error: "No license found" }, 404)

  const licenseKey = data.license_key || data.license

  return json({
    license: licenseKey,
    license_key: licenseKey,
    plan: data.plan,
    expiry: data.expiry,
    created_at: data.created_at,
    customer_name: data.customer_name,
    machine_id: data.machine_id,
    paid: data.paid,
  })
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
