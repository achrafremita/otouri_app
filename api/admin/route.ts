import {
  buildLicense,
  computeExpiry,
  getParams,
  getSupabase,
  isAdmin,
  isValidMachineId,
  json,
  parsePlan,
  preflight,
  withErrors,
} from "@/lib/server"

const WRITE_ACTIONS = new Set(["create-license", "revoke-license", "reset-demo"])

const handle = withErrors(async (request) => {
  if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401)

  const supabase = getSupabase()
  const params = await getParams(request)
  const action = String(params.action || "stats")

  if (WRITE_ACTIONS.has(action) && request.method !== "POST") {
    return json({ error: "Use POST" }, 405)
  }

  const limit = Math.min(Number(params.limit) || 50, 500)

  switch (action) {
    case "stats": {
      const [licenses, demos, terms] = await Promise.all([
        supabase.from("licenses").select("*", { count: "exact", head: true }),
        supabase.from("demo_used").select("*", { count: "exact", head: true }),
        supabase.from("terms_accepted").select("*", { count: "exact", head: true }),
      ])
      const failed = licenses.error ?? demos.error ?? terms.error
      if (failed) throw failed
      return json({
        licenses: licenses.count ?? 0,
        demos_used: demos.count ?? 0,
        terms_accepted: terms.count ?? 0,
      })
    }

    case "list-licenses": {
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return json({ licenses: data })
    }

    case "list-demos": {
      const { data, error } = await supabase
        .from("demo_used")
        .select("*")
        .order("used_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return json({ demos: data })
    }

    case "create-license": {
      const planKey = parsePlan(params.plan)
      if (!isValidMachineId(params.machine_id)) return json({ error: "Invalid machine_id" }, 400)
      if (!planKey) return json({ error: "Invalid plan" }, 400)

      const days = params.days ? Number(params.days) : null
      if (days !== null && (!Number.isInteger(days) || days <= 0 || days > 36500)) {
        return json({ error: "Invalid days" }, 400)
      }

      const expiry = computeExpiry(planKey, days)
      const license = buildLicense(params.machine_id, expiry, planKey)
      const { error } = await supabase.from("licenses").insert({
        machine_id: params.machine_id,
        plan: planKey,
        expiry,
        license,
        amount: 0,
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      return json({ license, plan: planKey, expiry })
    }

    case "revoke-license": {
      if (!isValidMachineId(params.machine_id)) return json({ error: "Invalid machine_id" }, 400)
      const { error } = await supabase
        .from("licenses")
        .update({ revoked: true })
        .eq("machine_id", params.machine_id)
      if (error) throw error
      return json({ success: true })
    }

    case "reset-demo": {
      if (!isValidMachineId(params.machine_id)) return json({ error: "Invalid machine_id" }, 400)
      const { error } = await supabase.from("demo_used").delete().eq("machine_id", params.machine_id)
      if (error) throw error
      return json({ success: true })
    }

    default:
      return json({ error: `Unknown action: ${action}` }, 400)
  }
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
