"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { DashboardPanel, DashboardShell } from "@/components/dashboard-shell"
import { readGeneratedCredentials } from "@/lib/generated-credentials"

export default function AdminCredentialsPage() {
  const router = useRouter()
  const [rows, setRows] = useState(readGeneratedCredentials())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }
    setRows(readGeneratedCredentials())
    setLoading(false)
  }, [router])

  function exportCsv() {
    if (rows.length === 0) return
    const header = ["created_at", "full_name", "role", "login_id", "temporary_password"]
    const csvRows = rows.map((r) => [r.created_at, r.full_name, r.role, r.login_id, r.temporary_password])
    const csv = [header, ...csvRows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `generated_credentials_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    router.push("/")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="text-xl font-semibold">Loading Credentials</h1>
        </div>
      </main>
    )
  }

  return (
    <DashboardShell
      appName="ProctorAI Admin"
      title="Credentials"
      subtitle="Temporary credentials generated for newly provisioned or reset users."
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: "Credentials", active: true },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
    >
      <DashboardPanel title="Generated Temporary Credentials">
        <div className="mb-3 flex gap-2">
          <button onClick={exportCsv} disabled={rows.length === 0} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="py-2 pl-3">Generated At</th>
                <th>Name</th>
                <th>Role</th>
                <th>Login ID</th>
                <th>Temporary Password</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.login_id}-${idx}`} className="border-b last:border-b-0">
                  <td className="py-2 pl-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.full_name}</td>
                  <td>{row.role}</td>
                  <td className="font-mono">{row.login_id}</td>
                  <td className="font-mono">{row.temporary_password}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td className="py-3 pl-3 text-slate-600" colSpan={5}>No credentials generated yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </DashboardShell>
  )
}

