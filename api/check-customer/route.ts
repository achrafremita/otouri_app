import { NEW_CUSTOMER_PLANS, RENEWAL_PLANS } from "@/lib/plans"
import { getLatestLicense, getParams, isValidMachineId, json, preflight, withErrors } from "@/lib/server"

const handle = withErrors(async (request) => {
  const { machine_id } = await getParams(request)
  if (!isValidMachineId(machine_id)) return json({ error: "Invalid machine_id" }, 400)

  const latest = await getLatestLicense(machine_id)
  const isCustomer = Boolean(latest)

  return json({
    machine_id,
    is_customer: isCustomer,
    expiry: latest?.expiry ?? null,
    plans: isCustomer ? RENEWAL_PLANS : NEW_CUSTOMER_PLANS,
  })
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
