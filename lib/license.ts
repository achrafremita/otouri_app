import crypto from "node:crypto"

const PLAN_INFO: Record<string, { t: string; d: number }> = {
  first: { t: "f", d: 30 },
  FULL: { t: "f", d: 30 },
  f: { t: "f", d: 30 },
  month: { t: "m", d: 30 },
  MONTHLY: { t: "m", d: 30 },
  m: { t: "m", d: 30 },
  year: { t: "y", d: 365 },
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

export function generateOtr1License({
  machineId,
  plan,
  customerName = "",
  privateKey,
}: {
  machineId: string
  plan: string
  customerName?: string
  privateKey: string
}): string {
  const planKey = (plan || "FULL").toString()
  const planInfo = PLAN_INFO[planKey] || PLAN_INFO[planKey.toUpperCase()] || { t: "f", d: 30 }

  const formattedMid = machineId.trim().toUpperCase()
  const cleanName = customerName.trim()
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
  }

  const p64 = b64u(JSON.stringify(payload))
  const priv = crypto.createPrivateKey(formatPrivateKey(privateKey))

  const sigBuffer =
    priv.asymmetricKeyType === "ed25519"
      ? crypto.sign(null, Buffer.from(p64, "utf8"), priv)
      : crypto.sign("sha256", Buffer.from(p64, "utf8"), priv)

  const sig = b64u(sigBuffer)
  return `OTR1.${p64}.${sig}`
}
