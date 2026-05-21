"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, ClipboardList, LogOut, Users } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"

type ManagedUser = {
  role: string
  is_active: boolean
}

type SessionRow = {
  session_status: string
  warning_count: number
}

export default function AdminDashboardSummary() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isExiting, setIsExiting] = useState(false)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void load(rawToken)
  }, [router])

  async function load(activeToken: string) {
    setLoading(true)
    setError("")
    try {
      const meRes = await fetch(getApiPath("/auth/me"), {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const mePayload = await meRes.json().catch(() => ({}))
      if (!meRes.ok || (mePayload?.user?.role !== "administrator" && mePayload?.user?.role !== "admin")) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }

      const [usersRes, sessionsRes] = await Promise.all([
        fetch(getApiPath("/users"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/sessions"), { headers: { Authorization: `Bearer ${activeToken}` } }),
      ])
      const usersPayload = await usersRes.json().catch(() => ({}))
      const sessionsPayload = await sessionsRes.json().catch(() => ({}))
      if (usersRes.ok) setUsers(usersPayload.users || [])
      if (sessionsRes.ok) setSessions(sessionsPayload.sessions || [])
      if (!usersRes.ok || !sessionsRes.ok) setError("Some summary data could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const students = users.filter(u => u.role === "student").length
    const lecturers = users.filter(u => u.role === "lecturer").length
    const admins = users.filter(u => u.role === "administrator" || u.role === "admin").length
    const active = users.filter(u => u.is_active).length
    const highRisk = sessions.filter(s => (s.warning_count || 0) >= 3 || s.session_status === "locked").length
    return { students, lecturers, admins, active, total: users.length, sessions: sessions.length, highRisk }
  }, [users, sessions])

  async function logout() {
    setIsExiting(true)
    await new Promise((r) => setTimeout(r, 350))
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  return (
    <DashboardShell
      appName="ProctorAI Admin"
      title="Admin Dashboard"
      subtitle="Summary view. Use sidebar navigation for users, credentials, and logs operations."
      avatarName="Admin"
      sidebarItems={[
        { label: "Dashboard", href: "/admin", active: true },
        { label: "Users", href: "/admin/users" },
        { label: "Exams", href: "/admin/exams" },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <div className="flex items-center gap-2">
          <button onClick={() => void load(token)} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            Refresh
          </button>
          <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      }
      isExiting={isExiting}
      exitMessage="Signing out of admin..."
    >
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <DashboardPanel title="Loading Admin Dashboard">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Preparing admin summary...
          </div>
        </DashboardPanel>
      ) : null}

      {!loading ? (
      <>
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard label="Total Users" value={summary.total} />
        <MetricCard label="Active Users" value={summary.active} />
        <MetricCard label="Students" value={summary.students} />
        <MetricCard label="Lecturers" value={summary.lecturers} />
        <MetricCard label="Admins" value={summary.admins} />
        <MetricCard label="Sessions" value={summary.sessions} />
        <MetricCard label="High-Risk Sessions" value={summary.highRisk} />
      </section>

      <DashboardPanel title="Quick Navigation" subtitle="Open the operational pages from here or from the left sidebar.">
        <div className="grid gap-3 md:grid-cols-4">
          <Link href="/admin/users" className="rounded-xl border border-border bg-card p-4 transition hover:bg-accent/50">
            <Users className="h-5 w-5 text-[#1a2d5a]" />
            <p className="mt-2 text-sm font-semibold text-foreground">Users</p>
            <p className="mt-1 text-xs text-muted-foreground">Provision, manage, and activate/deactivate accounts.</p>
          </Link>
          <Link href="/admin/exams" className="rounded-xl border border-border bg-card p-4 transition hover:bg-accent/50">
            <ClipboardList className="h-5 w-5 text-[#1a2d5a]" />
            <p className="mt-2 text-sm font-semibold text-foreground">Exams</p>
            <p className="mt-1 text-xs text-muted-foreground">View all exams, assigned lecturers, and delete unwanted exams.</p>
          </Link>
          <Link href="/admin/credentials" className="rounded-xl border border-border bg-card p-4 transition hover:bg-accent/50">
            <BarChart3 className="h-5 w-5 text-[#1a2d5a]" />
            <p className="mt-2 text-sm font-semibold text-foreground">Credentials</p>
            <p className="mt-1 text-xs text-muted-foreground">View generated temporary credentials and export CSV.</p>
          </Link>
          <Link href="/admin/system-logs" className="rounded-xl border border-border bg-card p-4 transition hover:bg-accent/50">
            <BarChart3 className="h-5 w-5 text-[#1a2d5a]" />
            <p className="mt-2 text-sm font-semibold text-foreground">Logs</p>
            <p className="mt-1 text-xs text-muted-foreground">Audit activity, filter events, and monitor session risk.</p>
          </Link>
        </div>
      </DashboardPanel>
      </>
      ) : null}
    </DashboardShell>
  )
}
