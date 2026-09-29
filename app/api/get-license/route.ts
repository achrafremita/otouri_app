import { getParams, getSupabase, json, normalizePhone, preflight, withErrors } from "@/lib/server"

const handle = withErrors(async (request) => {
  const { phone: rawPhone } = await getParams(request)
  const phone = normalizePhone(rawPhone)
  if (!phone) return json({ error: "Invalid phone" }, 400)

  const { data, error } = await getSupabase()
    .from("licenses")
    .select("license, plan, expiry")
    .eq("phone", phone)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return json({ error: "No license found for this phone" }, 404)

  return json(data)
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
