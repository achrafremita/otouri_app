"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PLANS, formatDzd } from "@/lib/plans"

const PHONE_PATTERN = /^(0|\+213|00213)[567]\d{8}$/

const INCLUDED = [
  "امتلاك تطبيق عطوري بشكل دائم",
  "شهر مجاني من الخدمة (30 يوماً)",
  "التفعيل برقم هاتفك مباشرة من التطبيق",
]

export function CheckoutForm() {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanPhone = phone.replace(/[\s\-().]/g, "")
  const isPhoneValid = PHONE_PATTERN.test(cleanPhone)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isPhoneValid) {
      setError("أدخل رقم هاتف جزائري صحيح، مثال: 0555123456")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const origin = window.location.origin
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          plan: "FULL",
          success_url: `${origin}/success`,
          failure_url: `${origin}/?payment=failed`,
          locale: "ar",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || "تعذّر إنشاء عملية الدفع")
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
      setLoading(false)
    }
  }

  const plan = PLANS.FULL

  return (
    <section aria-labelledby="plan-title" className="mx-auto w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-xl border-2 border-primary bg-card p-6 shadow-sm md:p-8"
      >
        <div className="flex flex-col gap-3">
          <Badge className="w-fit">الشراء الأول</Badge>
          <h2 id="plan-title" className="text-xl font-semibold leading-snug text-balance">
            {plan.label}
          </h2>
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">{formatDzd(plan.amount)}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </p>
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="0555 12 34 56"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="phone-help"
            required
          />
          <p id="phone-help" className="text-xs text-muted-foreground">
            سيُربط الترخيص برقم هاتفك، وستستعمله لتفعيل التطبيق.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "جارٍ التحويل إلى الدفع..." : "شراء الآن ب 990000 دج"}
        </Button>
      </form>
    </section>
  )
}
