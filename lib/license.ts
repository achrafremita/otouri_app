import crypto from "node:crypto"

const PLAN_INFO: Record<string, { t: string; d: number }> = {
  first: { t: "f", d: 30 },
  FULL: { t: "f", d: 30 },
  f: { t: "f", d: 30 },
  month: { t: "m", d: 30 },
  monthly: { t: "m", d: 30 },
  MONTHLY: { t: "m", d: 30 },
  m: { t: "m", d: 30 },
  year: { t: "y", d: 365 },
  yearly: { t: "y", d: 365 },
  YEARLY: { t: "y", d: 365 },
  y: { t: "y", d: 365 },
}

function b64u(b: Buffer | string): string {
  return Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function formatPrivateKey(rawKey: string): string {
  let key = rawKey.trim()
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n")
  }
  if (!key.includes("-----BEGIN")) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`
  }
  return key
}

export function getSigningPrivateKey(): string | null {
  const key =
    process.env.LICENS_E_KEY ||
    process.env.LICENS_C_KEY ||
    process.env.LICENSE_PRIVATE_KEY ||
    process.env.LICENSE_SECRET_KEY
  return key ? key.trim() : null
}

export function generateOtr1License({
  machineId = "OTOURI-USER",
  plan,
  customerName = "",
  customerPhone = "",
  customerEmail = "",
  privateKey,
}: {
  machineId?: string
  plan: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  privateKey?: string
}): string {
  const planKey = (plan || "first").toString()
  const planInfo = PLAN_INFO[planKey] || PLAN_INFO[planKey.toLowerCase()] || PLAN_INFO[planKey.toUpperCase()] || { t: "f", d: 30 }

  const formattedMid = (machineId || customerPhone || "OTOURI-APP").trim().toUpperCase()
  const cleanName = (customerName || customerEmail || customerPhone || "Otouri Client").trim()
  const randomId = crypto.randomBytes(6).toString("hex")

  const payload = {
    m: formattedMid,
    mid: formattedMid,
    t: planInfo.t,
    type: plan,
    d: planInfo.d,
    i: randomId,
    c: cleanName,
    name: cleanName,
    phone: customerPhone || undefined,
    email: customerEmail || undefined,
  }

  const p64 = b64u(JSON.stringify(payload))
  const keyToUse = privateKey || getSigningPrivateKey()

  if (keyToUse) {
    try {
      const priv = crypto.createPrivateKey(formatPrivateKey(keyToUse))
      const sigBuffer =
        priv.asymmetricKeyType === "ed25519"
          ? crypto.sign(null, Buffer.from(p64, "utf8"), priv)
          : crypto.sign("sha256", Buffer.from(p64, "utf8"), priv)

      const sig = b64u(sigBuffer)
      return `OTR1.${p64}.${sig}`
    } catch (err) {
      console.warn("[license] Failed to sign with private key, falling back to HMAC token:", err)
    }
  }

  // Fallback signature with secret key
  const fallbackSecret = process.env.CHARGILY_SECRET_KEY || "otouri-secret-license-key"
  const sig = crypto.createHmac("sha256", fallbackSecret).update(p64).digest("base64url")
  return `OTR1.${p64}.${sig}`
}
