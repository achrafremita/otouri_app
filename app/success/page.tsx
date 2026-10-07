import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "تم الشراء والتفعيل — تطبيق عطوري",
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = params.checkout_id ?? params.id
  const checkoutId = typeof raw === "string" ? raw : ""

  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-bounce">
          <CheckCircle2 className="size-12" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="inline-flex mx-auto items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>تم التفعيل بنجاح</span>
          </div>
          <h1 className="text-2xl font-bold text-balance md:text-3xl text-foreground">
            تمت عملية الدفع وتفعيل الترخيص بنجاح!
          </h1>
        </div>

        <p className="leading-relaxed text-muted-foreground text-sm">
          افتح تطبيق عطوري وسجل الدخول برقم الهاتف الذي استخدمته عند الدفع للبدء في استخدام التطبيق فوراً.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full justify-center">
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
            لوحة الإدارة
          </Link>
        </div>
      </main>
    </>
  )
}
