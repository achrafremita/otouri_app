"use client"

import { useState, useEffect } from "react"
import {
  Check,
  Loader2,
  Zap,
  Sparkles,
  CreditCard,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PLANS, type PlanType } from "@/lib/plans"

const PHONE_PATTERN = /^(0|\+213|00213)[567]\d{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STORAGE_KEY = "otouri_client_session"

type UserStatus = "new" | "expired" | "active" | "checking"

export function CheckoutForm() {
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [activationType, setActivationType] = useState<"automatic" | "manual" | "تلقائي" | "يدوي">("automatic")
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("first")
  const [userStatus, setUserStatus] = useState<UserStatus>("new")
  const [statusDetails, setStatusDetails] = useState<{ expiry?: string; license?: string } | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chargilyError, setChargilyError] = useState<string | null>(null)
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null)

  // Load initial cached user info from localStorage if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.phone) setPhone(parsed.phone)
        if (parsed.email) setEmail(parsed.email)
        if (parsed.userStatus === "expired" || parsed.hadFirstLicense) {
          setUserStatus("expired")
          setSelectedPlan("monthly")
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Check user status when phone or email changes (debounced)
  useEffect(() => {
    const cleanPhone = phone.replace(/[\s\-().]/g, "")
    const isValidPhone = PHONE_PATTERN.test(cleanPhone)
    const isValidEmail = EMAIL_PATTERN.test(email.trim())

    if (!isValidPhone && !isValidEmail) {
      return
    }

    const timer = setTimeout(async () => {
      setCheckingUser(true)
      try {
        const queryParams = new URLSearchParams()
        if (isValidPhone) queryParams.set("phone", cleanPhone)
        if (isValidEmail) queryParams.set("email", email.trim())

        const res = await fetch(`/api/check-status?${queryParams.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (data.had_first_license) {
            if (data.is_expired) {
              setUserStatus("expired")
              setSelectedPlan((prev) => (prev === "first" ? "monthly" : prev))
            } else {
              setUserStatus("active")
              setSelectedPlan((prev) => (prev === "first" ? "monthly" : prev))
            }
            setStatusDetails({ expiry: data.expiry, license: data.license })

            // Cache in localStorage
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                phone: cleanPhone,
                email: email.trim(),
                userStatus: data.is_expired ? "expired" : "active",
                hadFirstLicense: true,
                expiry: data.expiry,
              })
            )
          } else {
            setUserStatus("new")
            setSelectedPlan("first")
          }
        }
      } catch (err) {
        console.warn("[check-status] Error:", err)
      } finally {
        setCheckingUser(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [phone, email])

  function handleActivationTypeChange(type: "automatic" | "manual" | "تلقائي" | "يدوي") {
    setActivationType(type)
    if (type === "manual" || type === "يدوي") {
      setChargilyError(null)
      setError(null)
    }
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setChargilyError(null)
    setManualSuccessMsg(null)

    const cleanPhone = phone.replace(/[\s\-().]/g, "")
    if (!PHONE_PATTERN.test(cleanPhone)) {
      setError("الرجاء إدخال رقم هاتف جزائري صحيح (مثال: 0555123456)")
      return
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("الرجاء إدخال بريد إلكتروني صحيح (مثال: example@gmail.com)")
      return
    }

    // Ensure expired users cannot select 'first'
    const planToUse: PlanType = userStatus === "expired" && selectedPlan === "first" ? "monthly" : selectedPlan
    const planConfig = PLANS[planToUse]

    setLoading(true)

    const isManual = activationType === "manual" || activationType === "يدوي"

    if (isManual) {
      // Manual activation request ONLY — DO NOT call /api/create-checkout
      try {
        const res = await fetch("/api/manual-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            email: email.trim(),
            type: planToUse,
            amount: planConfig.amount,
            activation_type: "manual",
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "تعذّر إرسال طلب التفعيل اليدوي")
        }

        setManualSuccessMsg("تم إرسال طلبك، سيتم تفعيلك في أقرب وقت")
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال طلب التفعيل")
      } finally {
        setLoading(false)
      }
    } else {
      // Automated checkout with Chargily Pay -> Full page redirect (NO iframe)
      try {
        const origin = window.location.origin
        const res = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            email: email.trim(),
            type: planToUse,
            amount: planConfig.amount,
            success_url: `${origin}/payment/success`,
            failure_url: `${origin}/?payment=failed`,
          }),
        })

        const data = await res.json()
        const targetUrl = data.checkout_url || data.url

        if (!res.ok || !targetUrl) {
          const errorMsg = data.error || "تعذّر إنشاء رابط الدفع مع Chargily Pay"
          setChargilyError(errorMsg)
          throw new Error(errorMsg)
        }

        // Full page redirect to Chargily checkout page
        window.location.href = targetUrl
      } catch (err) {
        const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الاتصال ببوابة الدفع"
        setChargilyError(msg)
        setError(msg)
        setLoading(false)
      }
    }
  }

  // Determine button text dynamically based on selection
  function getSubmitButtonText() {
    if (loading) return "جارٍ المعالجة..."
    const isManual = activationType === "manual" || activationType === "يدوي"
    if (isManual) {
      if (selectedPlan === "first") return "إرسال طلب شراء بـ 9900 دج"
      if (selectedPlan === "monthly") return "إرسال طلب تجديد بـ 950 دج"
      return "إرسال طلب تجديد بـ 9500 دج"
    }

    if (selectedPlan === "first") return "شراء الآن بـ 9900 دج"
    if (selectedPlan === "monthly") return "تجديد 950 دج"
    return "تجديد 9500 دج"
  }

  const isExpired = userStatus === "expired" || userStatus === "active"

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* User Status Banner */}
      {isExpired && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 shrink-0 text-amber-400" />
            <p className="text-sm font-medium">
              {userStatus === "active"
                ? "أنت عميل حالي لتطبيق عطوري (ترخيصك نشط). يمكنك تمديد الاشتراك."
                : "أهلاً بعودتك! انتهت فترة اشتراكك السابقة. اختر باقة لتجديد الخدمة:"}
            </p>
          </div>
          {statusDetails?.expiry && (
            <p className="mt-1 text-xs text-amber-300/80">
              تاريخ نهاية الاشتراك: {new Date(statusDetails.expiry).toLocaleDateString("ar-DZ")}
            </p>
          )}
        </div>
      )}

      {/* Manual Request Success Alert */}
      {manualSuccessMsg && (
        <div className="mb-6 animate-in fade-in zoom-in rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-5 text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-6 shrink-0 text-emerald-400" />
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-emerald-300">تم استلام طلبك بنجاح</h3>
              <p className="text-sm text-emerald-100">{manualSuccessMsg}</p>
              <p className="mt-2 text-xs text-emerald-200/80">
                سيقوم فريق الدعم بمراجعة وتفعيل حسابك برقم الهاتف: <span className="font-mono font-bold text-white">{phone}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Activation Card */}
      <Card className="border-border/60 shadow-xl backdrop-blur-md">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Step 1: Client Information */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  بيانات العميل
                </h3>
                {checkingUser && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    جارٍ التحقق من الحساب...
                  </span>
                )}
              </div>

              {/* Phone Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  رقم الهاتف <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="0555 12 34 56"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-right tracking-wide font-mono h-11"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  أدخل رقم هاتفك الذي تستعمله في تطبيق عطوري لتفعيل الترخيص مباشرة.
                </p>
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  البريد الإلكتروني <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-right h-11"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  سنرسل تفاصيل التفعيل ووصل الدفع إلى بريدك الإلكتروني.
                </p>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Step 2: Plan Selection based on status */}
            <div className="flex flex-col gap-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                اختر الباقة المناسبة
              </Label>

              {/* IF NEW USER: Show ONLY 9900 Option */}
              {!isExpired && (
                <div
                  onClick={() => setSelectedPlan("first")}
                  className="relative cursor-pointer rounded-xl border-2 border-primary bg-primary/5 p-5 transition-all hover:bg-primary/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">عرض الشراء الأول</Badge>
                        <span className="text-xs text-emerald-400 font-medium">شامل 30 يوم مجاناً</span>
                      </div>
                      <h4 className="text-lg font-bold text-foreground">
                        {PLANS.first.nameAr} - 9900 دج
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        امتلاك دائم لتطبيق عطوري + شهر كامل (30 يوم) مجاناً
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-2xl font-black text-primary">9,900</span>
                      <span className="text-xs text-muted-foreground mr-1">دج</span>
                    </div>
                  </div>

                  <ul className="mt-4 flex flex-col gap-1.5 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-primary" />
                      ترخيص دائم مدى الحياة
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-primary" />
                      30 يوماً من التحديثات والدعم الفني مجاناً
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-primary" />
                      تفعيل فوري برقم هاتفك
                    </li>
                  </ul>
                </div>
              )}

              {/* IF EXPIRED USER: Show TWO renewal options (Hide 9900 completely) */}
              {isExpired && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Monthly Plan */}
                  <div
                    onClick={() => setSelectedPlan("monthly")}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      selectedPlan === "monthly"
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/60 bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={selectedPlan === "monthly" ? "default" : "outline"}>
                          {PLANS.monthly.badge}
                        </Badge>
                        <input
                          type="radio"
                          name="plan_selection"
                          checked={selectedPlan === "monthly"}
                          onChange={() => setSelectedPlan("monthly")}
                          className="accent-primary size-4"
                        />
                      </div>
                      <h4 className="font-bold text-foreground">{PLANS.monthly.label}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">950</span>
                        <span className="text-xs text-muted-foreground">دج / 30 يوم</span>
                      </div>
                      <p className="text-xs text-muted-foreground">تجديد شهر كامل لخدمات عطوري</p>
                    </div>
                  </div>

                  {/* Yearly Plan (Best Value) */}
                  <div
                    onClick={() => setSelectedPlan("yearly")}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      selectedPlan === "yearly"
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/60 bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="absolute -top-2.5 left-3">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                        خصم 17%
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={selectedPlan === "yearly" ? "default" : "outline"}>
                          {PLANS.yearly.badge}
                        </Badge>
                        <input
                          type="radio"
                          name="plan_selection"
                          checked={selectedPlan === "yearly"}
                          onChange={() => setSelectedPlan("yearly")}
                          className="accent-primary size-4"
                        />
                      </div>
                      <h4 className="font-bold text-foreground">{PLANS.yearly.label}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">9,500</span>
                        <span className="text-xs text-muted-foreground">دج / 365 يوم</span>
                      </div>
                      <p className="text-xs text-muted-foreground">سنة كاملة مع توفير شهرين مجاناً</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* Step 3: Activation Type Radio */}
            <div className="flex flex-col gap-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                نوع التفعيل
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Automatic Chargily */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                    activationType === "automatic" || activationType === "تلقائي"
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="activation_type"
                    value="automatic"
                    checked={activationType === "automatic" || activationType === "تلقائي"}
                    onChange={() => handleActivationTypeChange("automatic")}
                    className="accent-primary size-4 mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      تلقائي - دفع فوري بـ Chargily
                      <Zap className="size-3.5 text-amber-400 fill-amber-400" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      دفع آمن بالبطاقة الذهبية أو CIB وتفعيل فوري داخل الموقع.
                    </span>
                  </div>
                </label>

                {/* Manual Request */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                    activationType === "manual" || activationType === "يدوي"
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="activation_type"
                    value="manual"
                    checked={activationType === "manual" || activationType === "يدوي"}
                    onChange={() => handleActivationTypeChange("manual")}
                    className="accent-primary size-4 mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      يدوي - طلب تفعيل
                      <Clock className="size-3.5 text-blue-400" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      إرسال طلب للإدارة للتفعيل اليدوي والتواصل معك.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {(error || chargilyError) && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error || chargilyError}</span>
              </div>
            )}

            {/* Submit Button - Dynamic Price without bug */}
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full text-base font-bold py-6 shadow-lg shadow-primary/20 transition-transform active:scale-[0.99]"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : activationType === "automatic" || activationType === "تلقائي" ? (
                <Zap className="size-5 ml-2" />
              ) : (
                <Clock className="size-5 ml-2" />
              )}
              {getSubmitButtonText()}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const ActivationView = CheckoutForm
export default CheckoutForm
