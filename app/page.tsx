import { ShieldCheck, Zap, Gift, Sparkles, CheckCircle2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CheckoutForm } from "@/components/checkout-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "تفعيل تطبيق عطوري — Otouri Activation",
  description: "نظام التفعيل الرسمي لتطبيق عطوري عبر Chargily Pay والبطاقة الذهبية / CIB.",
}

const FEATURES = [
  { icon: ShieldCheck, text: "دفع آمن بالبطاقة الذهبية و CIB" },
  { icon: Zap, text: "تفعيل فوري برقم هاتفك" },
  { icon: Gift, text: "الشراء الأول يشمل شهراً مجانياً" },
]

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        {/* Hero Section */}
        <section className="mb-10 flex flex-col items-center text-center gap-4 text-balance">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>بوابة التفعيل الرسمية المعتمدة</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl text-foreground">
            تفعيل تطبيق <span className="bg-gradient-to-l from-emerald-500 to-primary bg-clip-text text-transparent">عطوري</span>
          </h1>

          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-base">
            الشراء الأول هو امتلاك تطبيق عطوري بشكل دائم مع 30 يوماً مجانية من التحديثات والدعم. أدخل رقم هاتفك وبريدك الإلكتروني لتفعيل حسابك فوراً.
          </p>

          <ul className="flex flex-wrap justify-center items-center gap-3 md:gap-6 pt-2 text-xs md:text-sm font-medium text-foreground">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full border border-border/60">
                <Icon className="size-4 text-primary shrink-0" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Activation Form Component */}
        <CheckoutForm />
      </main>
    </>
  )
}
