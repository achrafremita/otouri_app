import { PLANS, normalizePlanType, type PlanType } from "@/lib/plans"
import { generateOtr1License } from "@/lib/license"
import {
  computeExpiry,
  getParams,
  getSupabase,
  isAdmin,
  json,
  normalizeEmail,
  normalizePhone,
  preflight,
  withErrors,
} from "@/lib/server"

const handle = withErrors(async (request) => {
  if (!isAdmin(request)) {
    return json({ error: "غير مصرح - كلمة مرور المشرف غير صحيحة" }, 401)
  }

  const supabase = getSupabase()
  const params = await getParams(request)
  const action = String(params.action || "list")

  switch (action) {
    case "stats": {
      const [totalRes, autoRes, manualRes, pendingRes, allRows] = await Promise.all([
        supabase.from("licenses").select("id", { count: "exact", head: true }),
        supabase.from("licenses").select("id", { count: "exact", head: true }).eq("activation_type", "تلقائي"),
        supabase.from("licenses").select("id", { count: "exact", head: true }).eq("activation_type", "يدوي"),
        supabase.from("licenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("licenses").select("id, expiry, status, revoked"),
      ])

      const rows = allRows.data || []
      const now = Date.now()
      let expiredCount = 0
      let activeCount = 0

      rows.forEach((r) => {
        if (r.revoked) return
        if (r.status === "pending") return
        if (r.expiry && new Date(r.expiry).getTime() < now) {
          expiredCount++
        } else {
          activeCount++
        }
      })

      return json({
        total: totalRes.count ?? rows.length,
        automatic: autoRes.count ?? 0,
        manual: manualRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        expired: expiredCount,
        active: activeCount,
      })
    }

    case "list":
    case "list-licenses": {
      const search = String(params.search || "").trim()
      const activationType = String(params.activation_type || "").trim()
      const statusFilter = String(params.status || "").trim()
      const limit = Math.min(Number(params.limit) || 100, 500)

      let query = supabase.from("licenses").select("*").order("created_at", { ascending: false }).limit(limit)

      if (activationType && activationType !== "all") {
        query = query.eq("activation_type", activationType)
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      if (search) {
        query = query.or(`phone.ilike.%${search}%,email.ilike.%${search}%,customer_name.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Enrich with calculated dynamic status if expired
      const now = Date.now()
      const enriched = (data || []).map((row) => {
        let computedStatus = row.status || "active"
        if (row.revoked) {
          computedStatus = "revoked"
        } else if (computedStatus !== "pending" && row.expiry && new Date(row.expiry).getTime() < now) {
          computedStatus = "expired"
        }
        return {
          ...row,
          computed_status: computedStatus,
        }
      })

      return json({ licenses: enriched })
    }

    case "manual-activate":
    case "create-license": {
      const phone = normalizePhone(params.phone)
      const email = normalizeEmail(params.email)
      const planType: PlanType = normalizePlanType(params.type || params.plan || "first")
      const days = params.days ? Number(params.days) : PLANS[planType].days
      const amount = Number(params.amount) >= 0 ? Number(params.amount) : PLANS[planType].amount

      if (!phone && !email) {
        return json({ error: "يجب إدخال رقم الهاتف أو البريد الإلكتروني" }, 400)
      }

      const expiry = computeExpiry(planType, days)
      const licenseKey = generateOtr1License({
        customerPhone: phone || undefined,
        customerEmail: email || undefined,
        plan: planType,
        machineId: phone || email || "OTOURI",
      })

      const payload = {
        phone: phone || null,
        email: email || null,
        purchase_type: planType,
        plan: PLANS[planType].key,
        activation_type: "يدوي",
        status: "active",
        amount,
        expiry,
        license: licenseKey,
        license_key: licenseKey,
        paid: true,
        customer_name: email || phone || "عميل تفعيل يدوي",
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("licenses").insert(payload).select().maybeSingle()
      if (error) {
        console.error("[admin manual-activate] Error:", error)
        throw error
      }

      return json({ success: true, message: "تم تفعيل العميل بنجاح", license: data || payload })
    }

    case "activate-pending": {
      const id = params.id ? String(params.id) : null
      const activateAll = Boolean(params.all)

      if (activateAll) {
        // Find all pending requests
        const { data: pendingRows, error: findError } = await supabase
          .from("licenses")
          .select("*")
          .eq("status", "pending")

        if (findError) throw findError

        let activatedCount = 0
        for (const row of pendingRows || []) {
          const planType = normalizePlanType(row.purchase_type || row.plan || "first")
          const expiry = computeExpiry(planType, null)
          const licenseKey = generateOtr1License({
            customerPhone: row.phone || undefined,
            customerEmail: row.email || undefined,
            plan: planType,
          })

          await supabase
            .from("licenses")
            .update({
              status: "active",
              paid: true,
              expiry,
              license: licenseKey,
              license_key: licenseKey,
            })
            .eq("id", row.id)

          activatedCount++
        }

        return json({ success: true, message: `تم تفعيل ${activatedCount} طلبات بنجاح`, count: activatedCount })
      }

      if (!id) return json({ error: "معرف الطلب مطلوب" }, 400)

      const { data: targetRow, error: targetError } = await supabase
        .from("licenses")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (targetError || !targetRow) {
        return json({ error: "الطلب غير موجود" }, 404)
      }

      const planType = normalizePlanType(targetRow.purchase_type || targetRow.plan || "first")
      const expiry = computeExpiry(planType, null)
      const licenseKey = generateOtr1License({
        customerPhone: targetRow.phone || undefined,
        customerEmail: targetRow.email || undefined,
        plan: planType,
      })

      const { error: updateError } = await supabase
        .from("licenses")
        .update({
          status: "active",
          paid: true,
          expiry,
          license: licenseKey,
          license_key: licenseKey,
        })
        .eq("id", id)

      if (updateError) throw updateError

      return json({ success: true, message: "تم تفعيل الترخيص بنجاح", license_key: licenseKey, expiry })
    }

    case "extend-license": {
      const id = params.id ? String(params.id) : null
      const extraDays = Number(params.days) || 30
      if (!id) return json({ error: "معرف الترخيص مطلوب" }, 400)

      const { data: row } = await supabase.from("licenses").select("*").eq("id", id).maybeSingle()
      if (!row) return json({ error: "الترخيص غير موجود" }, 404)

      const planType = normalizePlanType(row.purchase_type || row.plan || "monthly")
      const currentExpiry = row.expiry
      const newExpiry = computeExpiry(planType, extraDays, currentExpiry)

      await supabase
        .from("licenses")
        .update({ expiry: newExpiry, status: "active" })
        .eq("id", id)

      return json({ success: true, message: `تم تمديد الترخيص بـ ${extraDays} يوماً`, expiry: newExpiry })
    }

    case "revoke-license":
    case "revoke": {
      const id = params.id ? String(params.id) : null
      const phone = params.phone ? String(params.phone) : null
      if (!id && !phone) return json({ error: "معرف الترخيص أو رقم الهاتف مطلوب" }, 400)

      let query = supabase.from("licenses").update({ revoked: true, status: "revoked" })
      if (id) query = query.eq("id", id)
      else if (phone) query = query.eq("phone", phone)

      const { error } = await query
      if (error) throw error

      return json({ success: true, message: "تم إبطال الترخيص" })
    }

    case "delete-record": {
      const id = params.id ? String(params.id) : null
      if (!id) return json({ error: "معرف السجل مطلوب" }, 400)

      const { error } = await supabase.from("licenses").delete().eq("id", id)
      if (error) throw error

      return json({ success: true, message: "تم حذف السجل" })
    }

    default:
      return json({ error: `إجراء غير معروف: ${action}` }, 400)
  }
})

export const GET = handle
export const POST = handle
export const OPTIONS = preflight
