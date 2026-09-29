import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { buttonVariants } from "@/components/ui/button"
import { fetchChargilyCheckout, fulfillCheckout } from "@/lib/server"

export const metadata: Metadata = {
  title: "تم الشراء — عطوري",
}

async function confirmPayment(checkoutId: string) {
  if (!checkoutId) return true
  try {
    const checkout = await fetchChargilyCheckout(checkoutId)
    if (!checkout) return false
    const result = await fulfillCheckout(checkout)
    return result.ok
  } catch (err) {
    console.error("[success] fulfillment error:", err)
    return false
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = params.checkout_id ?? params.id
  const checkoutId = typeof raw === "string" ? raw : ""
  const confirmed = await confirmPayment(checkoutId)

  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
        {confirmed ? (
          <>
            <CheckCircle2 className="size-14 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-balance md:text-3xl">
              تم الشراء بنجاح، احتفظ برقم هاتفك للتفعيل
            </h1>
            <p className="leading-relaxed text-muted-foreground">
              افتح تطبيق عطوري وأدخل نفس رقم الهاتف الذي استعملته عند الدفع لتفعيل التطبيق مع شهرك المجاني.
            </p>
          </>
        ) : (
          <>
            <Clock className="size-14 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-balance">جارٍ تأكيد الدفع</h1>
            <p className="leading-relaxed text-muted-foreground">
              لم نتمكن من تأكيد الدفع بعد. إذا تم خصم المبلغ، سيُفعَّل ترخيصك تلقائياً خلال لحظات. احتفظ برقم هاتفك
              للتفعيل.
            </p>
          </>
        )}
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          العودة إلى الصفحة الرئيسية
        </Link>
      </main>
    </>
  )
}
