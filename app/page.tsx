import { ShieldCheck, Zap, Gift } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CheckoutForm } from "@/components/checkout-form"

const FEATURES = [
  { icon: ShieldCheck, text: "دفع آمن عبر CIB و الذهبية" },
  { icon: Zap, text: "التفعيل برقم هاتفك فقط" },
  { icon: Gift, text: "الشراء الأول يشمل شهراً مجانياً" },
]

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <section className="mb-10 flex flex-col gap-4 text-balance">
          <p className="text-sm font-medium text-primary">الدفع عبر Chargily Pay</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">تفعيل تطبيق عطوري</h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
            الشراء الأول هو امتلاك التطبيق بشكل دائم مع شهر مجاني من الخدمة. أدخل رقم هاتفك فقط وأكمل الدفع، ثم فعّل
            التطبيق بنفس الرقم.
          </p>
          <ul className="flex flex-col gap-2 pt-2 text-sm md:flex-row md:gap-6">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </section>
        <CheckoutForm />
      </main>
    </>
  )
}
