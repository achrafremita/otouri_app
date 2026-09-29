import { getParams, getSupabase, isValidMachineId, json, preflight, withErrors } from "@/lib/server"

export const POST = withErrors(async (request) => {
  const { machine_id, terms_version = "1.0" } = await getParams(request)
  if (!isValidMachineId(machine_id)) return json({ error: "Invalid machine_id" }, 400)

  const { error } = await getSupabase()
    .from("terms_accepted")
    .upsert(
      {
        machine_id,
        terms_version: String(terms_version).slice(0, 32),
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "machine_id" },
    )
  if (error) throw error

  return json({ success: true, machine_id })
})

export const OPTIONS = preflight
