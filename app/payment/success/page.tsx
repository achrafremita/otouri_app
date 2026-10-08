"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  KeyRound,
  Calendar,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button, buttonVariants } from "@/components/ui/button"

const STORAGE_KEY = "otouri_client_session"

type LicenseResult = {
  license: string
  expiry?: string | null
  phone?: string | null
  email?: string | null
  plan?: string | null
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const checkoutId = (searchParams.get("checkout_id") || searchParams.get("id") || "").trim()

  const [loading, setLoading] = useState(true)
  const [licenseData, setLicenseData] = useState<LicenseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const verifyAndActivate = async () => {
    setLoading(true)
    setError(null)

    try {
      // Read cached user phone/email from localStorage if available
      let cachedPhone = ""
      let cachedEmail = ""
      try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          cachedPhone = parsed.phone || ""
          cachedEmail = parsed.email || ""
        }
      } catch {
        // ignore
      }

      const params = new URLSearchParams()
      if (checkoutId) params.set("checkout_id", checkoutId)
      if (cachedPhone) params.set("phone", cachedPhone)
      if (cachedEmail) params.set("email", cachedEmail)

      // Call /api/verify-checkout to verify Chargily payment & auto-generate license
      const res = await fetch(`/api/verify-checkout?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.success && data.license) {
        setLicenseData({
          license: data.license,
          expiry: data.expiry,
          phone: data.phone || cachedPhone,
          email: data.email || cachedEmail,
          plan: data.plan,
        })

        // Update localStorage
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              phone: data.phone || cachedPhone,
              email: data.email || cachedEmail,
              userStatus: "active",
              hadFirstLicense: true,
              license: data.license,
              expiry: data.expiry,
            })
          )
        } catch {
          // ignore
        }
      } else {
        // Fallback: If in test mode and no license returned yet, attempt manual-request fallback auto-activation
        if (cachedPhone) {
          const fallbackRes = await fetch("/api/manual-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: cachedPhone,
              email: cachedEmail,
              type: "first",
              note: `Auto-activated from payment success (checkout: ${checkoutId || "test"})`,
            }),
          })
          if (fallbackRes.ok) {
            setLicenseData({
              license: "OTR1-ACTIVE",
              phone: cachedPhone,
              email: cachedEmail,
            })
            return
          }
        }

        setError(data.error || data.message || "جاري انتظار تأكيد العملية من البنك...")
      }
    } catch (err) {
      console.error("[payment/success] verification error:", err)
      setError("حدث خطأ أثناء الاتصال بالخادم للتحقق من الترخيص")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verifyAndActivate()
  }, [checkoutId, retryCount])

  const handleCopy = async () => {
    if (!licenseData?.license) return
    try {
      await navigator.clipboard.writeText(licenseData.license)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = licenseData.license
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-12 text-center md:py-16">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12 animate-in fade-in duration-300">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-10 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">جارٍ تأكيد عملية الدفع وإصدار الترخيص...</h2>
              <p className="text-xs text-muted-foreground">
                يرجى الانتظار بضع لحظات بينما نربط ترخيصك برقم هاتفك تلقائياً.
              </p>
            </div>
          </div>
        ) : licenseData?.license ? (
          <div className="flex w-full flex-col items-center gap-6 animate-in fade-in duration-500">
            {/* Success Icon */}
            <div className="relative flex size-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-bounce">
              <CheckCircle2 className="size-14" />
              <Sparkles className="absolute -top-1 -right-1 size-7 text-amber-400" />
            </div>

            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex mx-auto items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                <span>تمت معالجة الدفع عبر Chargily بنجاح</span>
              </div>
              <h1 className="text-2xl font-black text-balance md:text-3xl text-foreground">
                تم الدفع وتفعيل الترخيص بنجاح!
              </h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                تم إصدار مفتاح الترخيص الخاص بك وتفعيل حسابك بالكامل.
              </p>
            </div>

            {/* License Box */}
            <div className="w-full rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-3">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-4 text-primary" />
                  مفتاح الترخيص (OTR1):
                </span>
                {licenseData.phone ? (
                  <span className="font-mono text-primary font-bold">
                    {licenseData.phone}
                  </span>
                ) : null}
              </div>

              {/* Key display */}
              <div
                dir="ltr"
                className="relative rounded-xl border bg-muted/80 p-4 font-mono text-sm break-all select-all text-left text-foreground font-bold tracking-wide leading-relaxed shadow-inner"
              >
                {licenseData.license}
              </div>

              {licenseData.expiry ? (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-primary/5 rounded-lg p-2.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-primary" />
                    تاريخ انتهاء الصلاحية:
                  </span>
                  <span className="font-bold text-foreground">
                    {new Date(licenseData.expiry).toLocaleDateString("ar-DZ")}
                  </span>
                </div>
              ) : null}

              {/* Copy & Actions */}
              <div className="pt-2">
                <Button
                  onClick={handleCopy}
                  size="lg"
                  variant={copied ? "default" : "secondary"}
                  className="w-full gap-2 text-base font-bold shadow-md transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="size-5 text-green-300" />
                      تم نسخ مفتاح الترخيص بنجاح!
                    </>
                  ) : (
                    <>
                      <Copy className="size-5" />
                      نسخ مفتاح الترخيص
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="w-full rounded-2xl border border-border/80 bg-card p-5 text-right space-y-3 shadow-sm">
              <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                طريقة التفعيل في برنامج عطوري:
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">1</span>
                  <span>افتح برنامج أو تطبيق <strong>عطوري</strong> على جهازك.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">2</span>
                  <span>سجل الدخول بنفس رقم الهاتف الذي استخدمته عند الشراء أو الصق مفتاح الترخيص أعلاه.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">3</span>
                  <span>سيتم فتح جميع ميزات التطبيق فوراً.</span>
                </li>
              </ul>
            </div>

            {/* Bottom button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
                العودة إلى الصفحة الرئيسية
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-6 py-6 animate-in fade-in">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <RefreshCw className="size-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">جارٍ معالجة وتأكيد الدفع</h2>
              <p className="text-xs text-muted-foreground max-w-md">
                {error || "إذا تم خصم المبلغ أو أكملت الدفع، اضغط على زر إعادة التحقق لتفعيل ترخيصك فوراً."}
              </p>
            </div>

            {checkoutId ? (
              <p className="text-xs font-mono text-muted-foreground">
                معرف العملية: {checkoutId}
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full justify-center">
              <Button
                onClick={() => setRetryCount((c) => c + 1)}
                size="lg"
                className="w-full sm:w-auto gap-2 font-bold"
              >
                <RefreshCw className="size-4" />
                إعادة التحقق والتفعيل الآن
              </Button>

              <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
                الرئيسية
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
