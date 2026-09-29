import { getParams, getSupabase, isValidMachineId, json, preflight, withErrors } from "@/lib/server"

export const POST = withErrors(async (request) => {
  const { machine_id } = await getParams(request)
  if (!isValidMachineId(machine_id)) return json({ error: "Invalid machine_id" }, 400)

  const { error } = await getSupabase()
    .from("demo_used")
    .upsert(
      { machine_id, used_at: new Date().toISOString() },
      { onConflict: "machine_id", ignoreDuplicates: true },
    )
  if (error) throw error

  return json({ success: true, machine_id })
})

export const OPTIONS = preflight
