import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "شروط الاستخدام — عطوري",
  description: "شروط وأحكام استخدام تطبيق عطوري والخدمات المرتبطة به.",
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary w-fit">
              <FileText className="size-3.5" />
              <span>شروط الاستخدام</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
              شروط وأحكام الاستخدام
            </h1>
            <p className="text-sm text-muted-foreground">
              آخر تحديث: أكتوبر 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none flex flex-col gap-6 text-muted-foreground leading-relaxed">
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">1. القبول بالشروط</h2>
              <p>
                باستخدامك لتطبيق عطوري وخدمات التفعيل المرتبطة به، فإنك توافق على هذه الشروط والأحكام بالكامل. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام الخدمة.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">2. وصف الخدمة</h2>
              <p>
                تطبيق عطوري هو تطبيق تعليمي يقدم محتوى تعليمي مدفوع. نظام التفعيل يسمح للمستخدمين بشراء تراخيص استخدام التطبيق وتجديد الاشتراك عبر بوابة الدفع Chargily Pay.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">3. الدفع والتسعير</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>الشراء الأول: 9,900 دج — ترخيص دائم مع 30 يوم مجاناً.</li>
                <li>التجديد الشهري: 950 دج — 30 يوم إضافية.</li>
                <li>التجديد السنوي: 9,500 دج — 365 يوم إضافية.</li>
                <li>يتم الدفع بشكل آمن عبر بوابة Chargily Pay بالبطاقة الذهبية أو CIB.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">4. الترخيص والاستخدام</h2>
              <p>
                كل ترخيص مرتبط برقم هاتف واحد ولا يمكن نقله إلى رقم آخر. يمنحك الترخيص حق استخدام التطبيق وفقاً للباقة المختارة. يُمنع بيع أو إعادة توزيع أو مشاركة الترخيص.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">5. سياسة الاسترداد</h2>
              <p>
                بعد تفعيل الترخيص وتسليم مفتاح التفعيل، لا يمكن استرداد المبلغ المدفوع. في حالة وجود مشاكل تقنية تمنع استخدام التطبيق، يرجى التواصل مع الدعم الفني.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">6. تعديل الشروط</h2>
              <p>
                نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إعلامكم بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">7. التواصل</h2>
              <p>
                لأي استفسارات تتعلق بشروط الاستخدام، يرجى التواصل معنا عبر صفحة الدعم في التطبيق.
              </p>
            </section>
          </div>

          {/* Footer link */}
          <div className="border-t border-border/60 pt-6">
            <Link href="/" className="text-sm text-primary hover:underline">
              ← العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
