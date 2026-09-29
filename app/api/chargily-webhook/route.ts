import { createHmac, timingSafeEqual } from "node:crypto"
import { fulfillCheckout, json, preflight, withErrors } from "@/lib/server"

function isValidSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const POST = withErrors(async (request) => {
  const secretKey = process.env.CHARGILY_SECRET_KEY
  if (!secretKey) return json({ error: "CHARGILY_SECRET_KEY is not configured" }, 500)

  const rawBody = await request.text()
  const signature = request.headers.get("signature") ?? ""
  if (!signature || !isValidSignature(rawBody, signature, secretKey)) {
    return json({ error: "Invalid signature" }, 403)
  }

  const event = JSON.parse(rawBody)
  if (event?.type !== "checkout.paid" || !event.data) return json({ received: true })

  const result = await fulfillCheckout(event.data)
  return json({ received: true, fulfilled: result.ok })
})

export const OPTIONS = preflight
