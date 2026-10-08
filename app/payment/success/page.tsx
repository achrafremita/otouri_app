import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Sparkles, Smartphone, ShieldCheck } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "تم الدفع والتفعيل بنجاح — تطبيق عطوري",
  description: "تم تأكيد عملية الدفع وتفعيل الترخيص لتطبيق عطوري بنجاح.",
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const checkoutId = (params.checkout_id ?? params.id ?? "").toString()

  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
        <div className="relative flex size-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-bounce">
          <CheckCircle2 className="size-14" />
          <Sparkles className="absolute -top-1 -right-1 size-7 text-amber-400" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="inline-flex mx-auto items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            <span>تمت معالجة الدفع عبر Chargily بنجاح</span>
          </div>
          <h1 className="text-2xl font-black text-balance md:text-3xl text-foreground">
            تم الدفع وتفعيل الترخيص بنجاح!
          </h1>
        </div>

        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-lg text-right space-y-3">
          <p className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Smartphone className="size-4 text-primary" />
            الخطوات التالية لتشغيل التطبيق:
          </p>
          <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">1</span>
              <span>افتح برنامج أو تطبيق <strong>عطوري</strong> على جهازك.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">2</span>
              <span>سجل الدخول بنفس رقم الهاتف والبريد الإلكتروني المدخلين أثناء الدفع.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">3</span>
              <span>سيتم تفعيل الميزات والحساب تلقائياً وفوراً.</span>
            </li>
          </ul>
        </div>

        {checkoutId ? (
          <p className="text-[11px] font-mono text-muted-foreground/70">
            رقم العملية: {checkoutId}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full justify-center">
          <Link href="/" className={buttonVariants({ variant: "default", size: "lg", className: "w-full sm:w-auto" })}>
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </main>
    </>
  )
}
