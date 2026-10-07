import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { AdminDashboard } from "@/components/admin-dashboard"

export const metadata: Metadata = {
  title: "لوحة تحكم المشرف — تطبيق عطوري",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8">
        <AdminDashboard />
      </main>
    </>
  )
}
