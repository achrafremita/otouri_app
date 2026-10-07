"use client"

import { useState, useSyncExternalStore } from "react"
import useSWR from "swr"
import {
  Loader2,
  LogOut,
  Search,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Shield,
  Phone,
  Mail,
  Calendar,
  Users,
  CreditCard,
  X,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const TOKEN_KEY = "admin_auth_token"

type LicenseRow = {
  id: string
  phone: string | null
  email: string | null
  customer_name?: string | null
  purchase_type?: string | null
  plan?: string | null
  activation_type: "تلقائي" | "يدوي" | string
  amount: number | null
  created_at: string
  expiry: string | null
  status: "active" | "expired" | "pending" | "revoked" | string
  computed_status?: string
  license?: string | null
  license_key?: string | null
  checkout_id?: string | null
  revoked?: boolean | null
}

type Stats = {
  total: number
  automatic: number
  manual: number
  expired: number
  pending: number
  active: number
}

function adminRequest(token: string) {
  return async <T,>(action: string, body?: Record<string, unknown>): Promise<T> => {
    const headers: HeadersInit = { Authorization: `Bearer ${token}` }
    let url = `/api/admin?action=${action}`
    const init: RequestInit = { headers }

    if (body) {
      url = "/api/admin"
      init.method = "POST"
      init.headers = { ...headers, "Content-Type": "application/json" }
      init.body = JSON.stringify({ action, ...body })
    }

    const response = await fetch(url, init)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "فشل تنفيذ الطلب")
    return data
  }
}

const tokenListeners = new Set<() => void>()
function subscribeToken(listener: () => void) {
  tokenListeners.add(listener)
  return () => tokenListeners.delete(listener)
}
function setStoredToken(value: string | null) {
  if (value) sessionStorage.setItem(TOKEN_KEY, value)
  else sessionStorage.removeItem(TOKEN_KEY)
  tokenListeners.forEach((l) => l())
}

export function AdminDashboard() {
  const token = useSyncExternalStore(
    subscribeToken,
    () => sessionStorage.getItem(TOKEN_KEY),
    () => null
  )

  if (!token) return <AdminLoginForm onSubmit={setStoredToken} />

  return <AdminMainView token={token} onLogout={() => setStoredToken(null)} />
}

function AdminLoginForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin?action=stats", {
        headers: { Authorization: `Bearer ${password.trim()}` },
      })
      if (!res.ok) {
        throw new Error("كلمة المرور غير صحيحة")
      }
      onSubmit(password.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-md py-12">
      <Card className="border-border/80 shadow-2xl backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Shield className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">لوحة تحكم المشرف - عطوري</CardTitle>
          <CardDescription>أدخل كلمة مرور المشرف (ADMIN_PASSWORD) للمتابعة.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-pass">كلمة المرور</Label>
              <Input
                id="admin-pass"
                type="password"
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 font-mono text-center tracking-widest"
              />
            </div>
            {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin ml-2" /> : null}
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminMainView({ token, onLogout }: { token: string; onLogout: () => void }) {
  const request = adminRequest(token)
  const [search, setSearch] = useState("")
  const [activationFilter, setActivationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modals state
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const statsSWR = useSWR<Stats>(["stats", token], ([action]) => request(action), {
    refreshInterval: 10000,
  })

  const licensesSWR = useSWR<{ licenses: LicenseRow[] }>(
    ["list-licenses", token, search, activationFilter, statusFilter],
    () =>
      request("list", {
        search,
        activation_type: activationFilter,
        status: statusFilter,
      }),
    { refreshInterval: 8000 }
  )

  const refreshData = () => {
    statsSWR.mutate()
    licensesSWR.mutate()
  }

  // Quick activate single pending row
  async function activatePending(rowId: string) {
    setActionLoading(rowId)
    setFeedbackMsg(null)
    try {
      await request("activate-pending", { id: rowId })
      setFeedbackMsg({ ok: true, text: "تم تفعيل الطلب بنجاح" })
      refreshData()
    } catch (err) {
      setFeedbackMsg({ ok: false, text: err instanceof Error ? err.message : "فشل التفعيل" })
    } finally {
      setActionLoading(null)
    }
  }

  // Quick batch activate all pending
  async function activateAllPending() {
    if (!confirm("هل أنت متأكد من تفعيل جميع الطلبات المعلقة دفعة واحدة؟")) return
    setActionLoading("all-pending")
    setFeedbackMsg(null)
    try {
      const res = await request<{ count: number }>("activate-pending", { all: true })
      setFeedbackMsg({ ok: true, text: `تم تفعيل ${res.count || "جميع"} الطلبات المعلقة بنجاح` })
      refreshData()
    } catch (err) {
      setFeedbackMsg({ ok: false, text: err instanceof Error ? err.message : "فشل التفعيل الشامل" })
    } finally {
      setActionLoading(null)
    }
  }

  // Revoke license
  async function revokeLicense(rowId: string) {
    if (!confirm("هل أنت متأكد من إبطال هذا الترخيص؟")) return
    setActionLoading(rowId)
    try {
      await request("revoke-license", { id: rowId })
      refreshData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الإبطال")
    } finally {
      setActionLoading(null)
    }
  }

  const licensesList = licensesSWR.data?.licenses || []
  const stats = statsSWR.data

  return (
    <div dir="rtl" className="flex flex-col gap-8 pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            لوحة إدارة التراخيص والعملاء
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              عطوري Otouri
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            متابعة عمليات الشراء، تفعيل الطلبات اليدوية، وإدارة العملاء.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshData()} className="gap-1.5">
            <RefreshCw className="size-4" />
            تحديث البيانات
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-destructive hover:bg-destructive/10">
            <LogOut className="size-4 ml-1.5" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 border text-sm font-medium animate-in fade-in ${
            feedbackMsg.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="bg-card/70 border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              مجموع العملاء
            </span>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {stats?.total ?? "—"}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Zap className="size-3.5" />
              تلقائي (Chargily)
            </span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums">
              {stats?.automatic ?? "—"}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
              <CreditCard className="size-3.5" />
              تفعيل يدوي
            </span>
            <span className="text-2xl font-black text-blue-400 tabular-nums">
              {stats?.manual ?? "—"}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              طلبات معلقة
            </span>
            <span className="text-2xl font-black text-amber-400 tabular-nums">
              {stats?.pending ?? 0}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              منتهي الصلاحية
            </span>
            <span className="text-2xl font-black text-rose-400 tabular-nums">
              {stats?.expired ?? "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card/60 p-4 rounded-xl border border-border/60">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الهاتف أو البريد الإلكتروني..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 h-10 bg-background/80"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Activation Type Filter */}
          <select
            value={activationFilter}
            onChange={(e) => setActivationFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل أنواع التفعيل</option>
            <option value="تلقائي">تلقائي (Chargily)</option>
            <option value="يدوي">يدوي</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">في الانتظار (معلق)</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
          </select>

          {/* Manual Add Button */}
          <Button onClick={() => setManualModalOpen(true)} className="gap-1.5 h-10 shadow-md">
            <Plus className="size-4" />
            تفعيل يدوي
          </Button>

          {/* Activate All Pending Button */}
          {Number(stats?.pending) > 0 && (
            <Button
              variant="outline"
              onClick={activateAllPending}
              disabled={actionLoading === "all-pending"}
              className="gap-1.5 h-10 border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            >
              {actionLoading === "all-pending" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4 text-amber-400" />
              )}
              تفعيل الطلبات المعلقة ({stats?.pending})
            </Button>
          )}
        </div>
      </div>

      {/* Main Licenses Table */}
      <Card className="border-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-right">ID</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">الإيمايل</TableHead>
                <TableHead className="text-right">نوع الشراء</TableHead>
                <TableHead className="text-right">نوع التفعيل</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">تاريخ الشراء</TableHead>
                <TableHead className="text-right">ينتهي في</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licensesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    {licensesSWR.isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span>جارٍ تحميل البيانات...</span>
                      </div>
                    ) : (
                      "لا توجد تراخيص مسجلة حتى الآن"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                licensesList.map((row) => {
                  const status = row.computed_status || row.status || "active"
                  const planName =
                    row.purchase_type === "yearly" || row.plan === "YEARLY"
                      ? "سنوي (9500 دج)"
                      : row.purchase_type === "monthly" || row.plan === "MONTHLY"
                      ? "شهري (950 دج)"
                      : "شراء أول (9900 دج)"

                  return (
                    <TableRow key={row.id || `${row.phone}-${row.created_at}`} className="hover:bg-muted/30">
                      {/* 1. ID */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {String(row.id || "—").slice(0, 8)}
                      </TableCell>

                      {/* 2. Phone */}
                      <TableCell className="font-mono font-medium text-foreground" dir="ltr">
                        {row.phone || "—"}
                      </TableCell>

                      {/* 3. Email */}
                      <TableCell className="text-xs text-muted-foreground" dir="ltr">
                        {row.email || "—"}
                      </TableCell>

                      {/* 4. Purchase Type */}
                      <TableCell>
                        <span className="text-xs font-semibold">{planName}</span>
                      </TableCell>

                      {/* 5. Activation Type */}
                      <TableCell>
                        {row.activation_type === "تلقائي" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1">
                            <Zap className="size-3" />
                            تلقائي
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 gap-1">
                            <Clock className="size-3" />
                            يدوي
                          </Badge>
                        )}
                      </TableCell>

                      {/* 6. Amount */}
                      <TableCell className="font-semibold tabular-nums">
                        {row.amount ? `${Number(row.amount).toLocaleString("fr-DZ")} دج` : "9,900 دج"}
                      </TableCell>

                      {/* 7. Purchase Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString("ar-DZ") : "—"}
                      </TableCell>

                      {/* 8. Expiry */}
                      <TableCell className="text-xs whitespace-nowrap">
                        {row.expiry ? (
                          <span
                            className={
                              new Date(row.expiry).getTime() < Date.now()
                                ? "text-rose-400 font-medium"
                                : "text-emerald-400"
                            }
                          >
                            {new Date(row.expiry).toLocaleDateString("ar-DZ")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      {/* 9. Status */}
                      <TableCell>
                        {status === "pending" ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse">
                            انتظار
                          </Badge>
                        ) : status === "expired" ? (
                          <Badge variant="destructive">منتهي</Badge>
                        ) : status === "revoked" ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            ملغي
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white">نشط</Badge>
                        )}
                      </TableCell>

                      {/* 10. Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => activatePending(row.id)}
                              disabled={actionLoading === row.id}
                              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                            >
                              {actionLoading === row.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                              تفعيل
                            </Button>
                          )}

                          {status !== "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => revokeLicense(row.id)}
                              disabled={actionLoading === row.id}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="إلغاء الترخيص"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Manual Client Activation Modal */}
      {manualModalOpen && (
        <ManualActivationModal
          request={request}
          onClose={() => setManualModalOpen(false)}
          onSuccess={() => {
            setManualModalOpen(false)
            setFeedbackMsg({ ok: true, text: "تم إنشاء وتفعيل الترخيص اليدوي بنجاح" })
            refreshData()
          }}
        />
      )}
    </div>
  )
}

function ManualActivationModal({
  request,
  onClose,
  onSuccess,
}: {
  request: ReturnType<typeof adminRequest>
  onClose: () => void
  onSuccess: () => void
}) {
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState<"first" | "monthly" | "yearly">("first")
  const [customDays, setCustomDays] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim() && !email.trim()) {
      setError("يجب إدخال رقم الهاتف أو البريد الإلكتروني")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await request("manual-activate", {
        phone: phone.trim(),
        email: email.trim(),
        type,
        days: customDays ? Number(customDays) : undefined,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء الترخيص")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div dir="rtl" className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Plus className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">تفعيل عميل يدوي</h3>
              <p className="text-xs text-muted-foreground">إضافة وترخيص عميل في قاعدة البيانات مباشرة</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-phone">رقم الهاتف</Label>
            <Input
              id="manual-phone"
              dir="ltr"
              placeholder="0555123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-right font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-email">البريد الإلكتروني</Label>
            <Input
              id="manual-email"
              type="email"
              dir="ltr"
              placeholder="client@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-type">نوع الشراء / الباقة</Label>
              <select
                id="manual-type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="first">شراء أول (9900 دج - 30 يوم)</option>
                <option value="monthly">تجديد شهري (950 دج - 30 يوم)</option>
                <option value="yearly">تجديد سنوي (9500 دج - 365 يوم)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-days">مدة مخصصة بالأيام (اختياري)</Label>
              <Input
                id="manual-days"
                type="number"
                placeholder="افتراضي حسب الباقة"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              حفظ وتفعيل الترخيص
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
