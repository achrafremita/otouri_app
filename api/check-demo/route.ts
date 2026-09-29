import { getParams, getSupabase, isValidMachineId, json, preflight, withErrors } from "@/lib/server"

const handle = withErrors(async (request) => {
  const { machine_id } = await getParams(request)
  if (!isValidMachineId(machine_id)) return json({ error: "Invalid machine_id" }, 400)

  const { data, error } = await getSupabase()
    .from("demo_used")
    .select("machine_id, used_at")
    .eq("machine_id", machine_id)
    .maybeSingle()
  if (error) throw error

  return json({ machine_id, demo_used: Boolean(data), used_at: data?.used_at ?? null })
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
