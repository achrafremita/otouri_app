import { PLANS, normalizePlanType } from "@/lib/plans"
import {
  getParams,
  getSupabase,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
  withErrors,
} from "@/lib/server"

export const POST = withErrors(async (request) => {
  const {
    phone: rawPhone,
    email: rawEmail,
    type: rawType = "first",
    plan: rawPlan,
    note,
  } = await getParams(request)

  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)
  const planType = normalizePlanType(rawType || rawPlan || "first")

  if (!phone) {
    return json({ error: "رقم الهاتف مطلوب وغير صحيح. مثال: 0555123456" }, 400)
  }
  if (!email) {
    return json({ error: "البريد الإلكتروني مطلوب وغير صحيح. مثال: user@gmail.com" }, 400)
  }

  const planConfig = PLANS[planType]
  const amount = planConfig.amount
  const supabase = getSupabase()

  // Insert manual activation request as pending
  const payload: Record<string, any> = {
    phone,
    email,
    purchase_type: planType,
    plan: planConfig.key,
    activation_type: "يدوي",
    status: "pending",
    amount,
    customer_name: email || phone,
    paid: false,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("licenses").insert(payload).select().maybeSingle()

  if (error) {
    console.error("[manual-request] Insert error:", error)
    // Fallback if some schema column fails
    await supabase.from("licenses").insert({
      phone,
      plan: planConfig.key,
      amount,
      created_at: new Date().toISOString(),
    }).catch(() => {})
  }

  return json({
    success: true,
    message: "تم إرسال طلبك، سيتم تفعيلك في أقرب وقت",
    data: data || { phone, email, planType, status: "pending" },
  })
})

export const OPTIONS = preflight
