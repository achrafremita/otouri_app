"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Laptop,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button, buttonVariants } from "@/components/ui/button"

type LicenseData = {
  license: string
  license_key?: string
  plan?: string
  customer_name?: string
  expiry?: string
  created_at?: string
}

function PaySuccessContent() {
  const searchParams = useSearchParams()
  const mid = (searchParams.get("mid") || searchParams.get("machine_id") || "").trim()

  const [licenseData, setLicenseData] = useState<LicenseData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const activeKey = licenseData?.license_key || licenseData?.license || ""

  const fetchLicense = async () => {
    if (!mid) return false
    try {
      const res = await fetch(`/api/get-license?mid=${encodeURIComponent(mid)}`, {
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        if (data && (data.license || data.license_key)) {
          setLicenseData(data)
          return true
        }
      }
      return false
    } catch (err) {
      console.error("[pay/success] fetch error:", err)
      return false
    }
  }

  // Poll every 3 seconds until license is found
  useEffect(() => {
    if (!mid) return

    let isMounted = true
    let pollTimer: NodeJS.Timeout | null = null

    // Initial check
    fetchLicense().then((found) => {
      if (found || !isMounted) return

      pollTimer = setInterval(async () => {
        const foundLicense = await fetchLicense()
        if (foundLicense && pollTimer) {
          clearInterval(pollTimer)
        }
      }, 3000)
    })

    // Track elapsed time every second
    const intervalTimer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => {
      isMounted = false
      if (pollTimer) clearInterval(pollTimer)
      clearInterval(intervalTimer)
    }
  }, [mid])

  const handleCopy = async () => {
    if (!activeKey) return
    try {
      await navigator.clipboard.writeText(activeKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback copy
      const textarea = document.createElement("textarea")
      textarea.value = activeKey
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleOpenApp = () => {
    if (!activeKey) return
    // Attempt to open deep link into the Otouri desktop app
    window.location.href = `otouri://activate?key=${encodeURIComponent(activeKey)}`
  }

  const handleManualRetry = async () => {
    setIsRetrying(true)
    setError(null)
    const found = await fetchLicense()
    if (!found) {
      setError("لم يتم العثور على المفتاح بعد. يُرجى الانتظار قليلاً أو التواصل معنا.")
    }
    setIsRetrying(false)
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 py-12 text-center md:py-16">
        {activeKey ? (
          // License Found State
          <div className="flex w-full flex-col items-center gap-6 animate-in fade-in duration-500">
            <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-12" aria-hidden="true" />
              <Sparkles className="absolute -top-1 -right-1 size-6 text-amber-500 animate-bounce" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-balance">
                تم الدفع بنجاح وتوليد مفتاح الترخيص!
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                تم إنشاء وتوقيع مفتاح التفعيل الخاص بجهازك بنجاح.
              </p>
            </div>

            {/* License Box */}
            <div className="w-full rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-md md:p-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Laptop className="size-3.5" />
                    معرّف الجهاز: {mid || "—"}
                  </span>
                  {licenseData?.customer_name ? (
                    <span>العميل: {licenseData.customer_name}</span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="license-box" className="text-xs font-medium text-right text-muted-foreground">
                    مفتاح الترخيص الخاص بك (OTR1):
                  </label>
                  <div
                    id="license-box"
                    dir="ltr"
                    className="relative rounded-xl border bg-muted/70 p-4 font-mono text-sm break-all select-all text-left text-foreground font-semibold leading-relaxed shadow-inner"
                  >
                    {activeKey}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={handleCopy}
                    size="lg"
                    variant={copied ? "default" : "secondary"}
                    className="w-full gap-2 text-base font-semibold transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="size-5 text-green-300" aria-hidden="true" />
                        تم نسخ المفتاح!
                      </>
                    ) : (
                      <>
                        <Copy className="size-5" aria-hidden="true" />
                        نسخ المفتاح
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleOpenApp}
                    size="lg"
                    className="w-full gap-2 text-base font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <ExternalLink className="size-5" aria-hidden="true" />
                    فتح التطبيق
                  </Button>
                </div>
              </div>
            </div>

            {/* Step by step guide */}
            <div className="rounded-xl border bg-card/60 p-5 text-right text-xs text-muted-foreground w-full space-y-2">
              <p className="font-semibold text-foreground text-sm">طريقة التفعيل السريعة:</p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>اضغط على زر <strong>نسخ المفتاح</strong> أعلاه.</li>
                <li>افتح برنامج <strong>عطوري</strong> على حاسوبك.</li>
                <li>انقر على زر <strong>تفعيل الترخيص</strong> وألصق المفتاح.</li>
              </ol>
            </div>

            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        ) : (
          // Loading / Polling State
          <div className="flex w-full flex-col items-center gap-6 animate-in fade-in duration-300">
            <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-10 text-primary animate-spin" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-balance">
                {elapsed >= 30 ? "جاري توليد المفتاح..." : "جارٍ معالجة الدفع وتوليد المفتاح..."}
              </h1>
              <p className="text-sm text-muted-foreground md:text-base leading-relaxed max-w-md">
                {elapsed >= 30
                  ? "جاري تأكيد عملية الدفع مع Chargily وإصدار الترخيص، الرجاء الانتظار بضع لحظات..."
                  : "نقوم الآن بتأكيد عملية الدفع من Chargily وربط الترخيص بمعرّف جهازك تلقائياً."}
              </p>
            </div>

            {mid ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-xs font-mono text-muted-foreground">
                <Laptop className="size-4 text-primary" />
                <span>معرّف الجهاز: {mid}</span>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-4 py-2">
                تنبيه: لم يتم تمرير معرّف الجهاز في الرابط.
              </p>
            )}

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRetry}
                disabled={isRetrying}
                className="gap-2"
              >
                <RefreshCw className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
                إعادة التحقق الآن
              </Button>

              <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                العودة للرئيسية
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaySuccessContent />
    </Suspense>
  )
}
