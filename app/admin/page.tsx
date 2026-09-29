import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { AdminDashboard } from "@/components/admin-dashboard"

export const metadata: Metadata = {
  title: "Admin — License Store",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Admin</h1>
        <AdminDashboard />
      </main>
    </>
  )
}
