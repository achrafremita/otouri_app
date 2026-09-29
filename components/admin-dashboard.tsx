"use client"

import { useState, useSyncExternalStore } from "react"
import useSWR from "swr"
import { Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const TOKEN_KEY = "admin_token"

type LicenseRow = {
  machine_id: string
  plan: string
  expiry: string
  license: string
  amount: number | null
  revoked: boolean | null
  created_at: string
}
type DemoRow = { machine_id: string; used_at: string }
type Stats = { licenses: number; demos_used: number; terms_accepted: number }

function adminRequest(token: string) {
  return async <T,>(action: string, body?: Record<string, unknown>): Promise<T> => {
    const init: RequestInit = { headers: { Authorization: `Bearer ${token}` } }
    let url = `/api/admin?action=${action}`
    if (body) {
      url = "/api/admin"
      init.method = "POST"
      init.headers = { ...init.headers, "Content-Type": "application/json" }
      init.body = JSON.stringify({ action, ...body })
    }
    const response = await fetch(url, init)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Request failed")
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
  tokenListeners.forEach((listener) => listener())
}

export function AdminDashboard() {
  const token = useSyncExternalStore(
    subscribeToken,
    () => sessionStorage.getItem(TOKEN_KEY),
    () => null,
  )

  if (!token) return <TokenForm onSubmit={setStoredToken} />

  return <Dashboard token={token} onLogout={() => setStoredToken(null)} />
}

function TokenForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter the ADMIN_TOKEN configured for this deployment.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim()) onSubmit(value.trim())
          }}
        >
          <Label htmlFor="admin-token">Admin token</Label>
          <Input id="admin-token" type="password" value={value} onChange={(e) => setValue(e.target.value)} required />
          <Button type="submit" className="self-start">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const request = adminRequest(token)
  const fetcher = ([action]: [string, string]) => request<any>(action)

  const stats = useSWR<Stats>(["stats", token], fetcher)
  const licenses = useSWR<{ licenses: LicenseRow[] }>(["list-licenses", token], fetcher)
  const demos = useSWR<{ demos: DemoRow[] }>(["list-demos", token], fetcher)

  const refreshAll = () => Promise.all([stats.mutate(), licenses.mutate(), demos.mutate()])

  if (stats.error?.message === "Unauthorized") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive">
          Invalid admin token.
        </p>
        <Button variant="outline" onClick={onLogout}>
          Try another token
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Signed in as admin</p>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>

      {stats.error ? (
        <p role="alert" className="text-sm text-destructive">
          {stats.error.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Licenses" value={stats.data?.licenses} />
        <StatCard label="Demos used" value={stats.data?.demos_used} />
        <StatCard label="Terms accepted" value={stats.data?.terms_accepted} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CreateLicenseForm request={request} onDone={refreshAll} />
        <MachineActions request={request} onDone={refreshAll} />
      </div>

      <Tabs defaultValue="licenses">
        <TabsList>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="demos">Demos</TabsTrigger>
        </TabsList>
        <TabsContent value="licenses">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(licenses.data?.licenses ?? []).map((row) => (
                <TableRow key={`${row.license}-${row.created_at}`}>
                  <TableCell className="font-mono text-xs">{row.machine_id}</TableCell>
                  <TableCell>{row.plan}</TableCell>
                  <TableCell>{row.expiry}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.amount ? `${(row.amount).toLocaleString()} DZD` : "—"}
                  </TableCell>
                  <TableCell>
                    {row.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge>Active</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <EmptyRow loading={licenses.isLoading} count={licenses.data?.licenses?.length} colSpan={6} />
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="demos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine ID</TableHead>
                <TableHead>Used at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(demos.data?.demos ?? []).map((row) => (
                <TableRow key={row.machine_id}>
                  <TableCell className="font-mono text-xs">{row.machine_id}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(row.used_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <EmptyRow loading={demos.isLoading} count={demos.data?.demos?.length} colSpan={2} />
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyRow({ loading, count, colSpan }: { loading: boolean; count?: number; colSpan: number }) {
  if (!loading && count) return null
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        {loading ? "Loading…" : "No records yet"}
      </TableCell>
    </TableRow>
  )
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value ?? "—"}</CardTitle>
      </CardHeader>
    </Card>
  )
}

type RequestFn = ReturnType<typeof adminRequest>

function CreateLicenseForm({ request, onDone }: { request: RequestFn; onDone: () => void }) {
  const [machineId, setMachineId] = useState("")
  const [plan, setPlan] = useState("FULL")
  const [days, setDays] = useState("")
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setResult(null)
    try {
      const data = await request<{ license: string }>("create-license", {
        machine_id: machineId.trim(),
        plan,
        ...(days ? { days: Number(days) } : {}),
      })
      setResult({ ok: true, text: data.license })
      onDone()
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue license manually</CardTitle>
        <CardDescription>Creates a free license (amount 0).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-machine-id">Machine ID</Label>
            <Input
              id="new-machine-id"
              className="font-mono"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="new-plan">Plan</Label>
              <select
                id="new-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="FULL">FULL</option>
                <option value="YEARLY">YEARLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="new-days">Custom days</Label>
              <Input
                id="new-days"
                type="number"
                min={1}
                placeholder="Optional"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Create license
          </Button>
          {result ? (
            <p
              role="status"
              className={result.ok ? "break-all font-mono text-xs" : "text-sm text-destructive"}
            >
              {result.text}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

function MachineActions({ request, onDone }: { request: RequestFn; onDone: () => void }) {
  const [machineId, setMachineId] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function run(action: "revoke-license" | "reset-demo") {
    if (!machineId.trim()) return
    setPending(action)
    setMessage(null)
    try {
      await request(action, { machine_id: machineId.trim() })
      setMessage({ ok: true, text: action === "revoke-license" ? "Licenses revoked." : "Demo reset." })
      onDone()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Machine actions</CardTitle>
        <CardDescription>Revoke all licenses or reset the demo for a machine.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="action-machine-id">Machine ID</Label>
          <Input
            id="action-machine-id"
            className="font-mono"
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={!!pending} onClick={() => run("revoke-license")}>
            {pending === "revoke-license" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Revoke licenses
          </Button>
          <Button variant="outline" disabled={!!pending} onClick={() => run("reset-demo")}>
            {pending === "reset-demo" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Reset demo
          </Button>
        </div>
        {message ? (
          <p role="status" className={message.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
