import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "سياسة الخصوصية — عطوري",
  description: "سياسة الخصوصية لتطبيق عطوري - كيف نتعامل مع بياناتك الشخصية.",
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" lang="ar" className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary w-fit">
              <ShieldCheck className="size-3.5" />
              <span>سياسة الخصوصية</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
              سياسة الخصوصية
            </h1>
            <p className="text-sm text-muted-foreground">
              آخر تحديث: أكتوبر 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none flex flex-col gap-6 text-muted-foreground leading-relaxed">
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">1. المقدمة</h2>
              <p>
                نرحب بكم في تطبيق عطوري. نحن نلتزم بحماية خصوصيتكم وبياناتكم الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية المعلومات التي نحصل عليها منكم عند استخدام خدماتنا.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">2. البيانات التي نجمعها</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>رقم الهاتف الجزائري لتفعيل الترخيص.</li>
                <li>البريد الإلكتروني لإرسال تفاصيل الشراء والتفعيل.</li>
                <li>معلومات الدفع تتم معالجتها بشكل آمن عبر بوابة Chargily Pay ولا نحتفظ ببيانات البطاقة المصرفية.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">3. كيف نستخدم بياناتكم</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>تفعيل ترخيص التطبيق وربطه برقم هاتفكم.</li>
                <li>إرسال تفاصيل الترخيص ومفتاح التفعيل إلى بريدكم الإلكتروني.</li>
                <li>الدعم الفني والتواصل معكم عند الحاجة.</li>
                <li>تحسين خدماتنا وتجربة المستخدم.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">4. حماية البيانات</h2>
              <p>
                نستخدم تقنيات تشفير متقدمة وبروتوكول HTTPS لحماية جميع البيانات المنقولة. نحتفظ ببياناتكم في خوادم آمنة ولا نشاركها مع أطراف ثالثة إلا في حدود ما يتطلبه تقديم الخدمة (مثل معالجة الدفع عبر Chargily Pay).
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">5. حقوقكم</h2>
              <p>
                يحق لكم طلب حذف بياناتكم الشخصية أو تعديلها في أي وقت عبر التواصل مع فريق الدعم الفني.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">6. التواصل</h2>
              <p>
                لأي استفسارات تتعلق بسياسة الخصوصية، يرجى التواصل معنا عبر صفحة الدعم في التطبيق.
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
