import { createHmac, timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { generateOtr1License } from "@/lib/license"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, signature",
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const chargilySecret = process.env.CHARGILY_SECRET_KEY
    const licensePrivateKey = process.env.LICENSE_PRIVATE_KEY
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!chargilySecret) {
      console.error("[chargily-webhook] Missing CHARGILY_SECRET_KEY")
      return json({ error: "Server misconfigured: CHARGILY_SECRET_KEY missing" }, 500)
    }

    const rawBody = await request.text()
    const signature = request.headers.get("signature") ?? ""

    if (!signature || !isValidSignature(rawBody, signature, chargilySecret)) {
      console.warn("[chargily-webhook] Invalid signature received")
      return json({ error: "Invalid signature" }, 403)
    }

    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return json({ error: "Invalid JSON body" }, 400)
    }

    // Only process successful paid checkouts
    const isPaidEvent = event?.type === "checkout.paid" || event?.data?.status === "paid"
    if (!isPaidEvent || !event.data) {
      return json({ success: true, message: "Event ignored (not paid)" })
    }

    const checkoutData = event.data
    const metadata = checkoutData.metadata || {}

    const machineId = (
      metadata.machine_id ||
      metadata.mid ||
      metadata.machineId ||
      ""
    ).toString().trim()

    const customerPhone = (
      metadata.phone ||
      metadata.customer_phone ||
      checkoutData.customer_phone ||
      ""
    ).toString().trim()

    const customerName = (
      metadata.customer_name ||
      metadata.name ||
      checkoutData.customer_name ||
      ""
    ).toString().trim()

    const plan = (metadata.plan || "FULL").toString().trim()

    if (!machineId) {
      console.warn("[chargily-webhook] No machine_id found in checkout metadata:", checkoutData.id)
    }

    let licenseKey = ""
    if (licensePrivateKey && machineId) {
      try {
        licenseKey = generateOtr1License({
          machineId,
          plan,
          customerName,
          privateKey: licensePrivateKey,
        })
      } catch (keyErr) {
        console.error("[chargily-webhook] Error generating OTR1 license:", keyErr)
      }
    } else if (!licensePrivateKey) {
      console.warn("[chargily-webhook] LICENSE_PRIVATE_KEY not configured, cannot sign OTR1 license")
    }

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      // Check if this checkout_id was already processed
      if (checkoutData.id) {
        const { data: existing } = await supabase
          .from("licenses")
          .select("id")
          .eq("checkout_id", checkoutData.id)
          .maybeSingle()

        if (existing) {
          return json({ success: true, message: "Already processed" })
        }
      }

      const rowToInsert: Record<string, any> = {
        machine_id: machineId || null,
        customer_name: customerName || null,
        plan,
        license_key: licenseKey || null,
        license: licenseKey || null,
        phone: customerPhone || null,
        paid: true,
        amount: checkoutData.amount || 0,
        checkout_id: checkoutData.id || null,
        created_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from("licenses").insert(rowToInsert)

      if (insertError && insertError.code !== "23505") {
        console.error("[chargily-webhook] Supabase insert error:", insertError)
        // If some column fails (e.g. schema variance), attempt fallback with standard columns
        if (insertError.message?.includes("column")) {
          const fallbackRow = {
            machine_id: machineId || null,
            phone: customerPhone || null,
            plan,
            license: licenseKey || null,
            amount: checkoutData.amount || 0,
            checkout_id: checkoutData.id || null,
            created_at: new Date().toISOString(),
          }
          await supabase.from("licenses").insert(fallbackRow).catch(() => {})
        }
      }
    } else {
      console.warn("[chargily-webhook] Supabase environment variables missing")
    }

    return json({ success: true, license_key: licenseKey })
  } catch (err) {
    console.error("[chargily-webhook] Unexpected error:", err)
    return json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
