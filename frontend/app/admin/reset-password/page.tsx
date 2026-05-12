"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { appendGeneratedCredential } from "@/lib/generated-credentials"
import { DashboardPanel, DashboardShell } from "@/components/dashboard-shell"

type ManagedUser = {
  user_id: number
  full_name: string
  registration_number: string
  username?: string | null
  email: string
  role: string
}

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [msg, setMsg] = useState("")
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void bootstrap(rawToken)
  }, [router])

  async function bootstrap(activeToken: string) {
    setLoading(true)
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch(getApiPath("/auth/me"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/users"), { headers: { Authorization: `Bearer ${activeToken}` } }),
      ])
      const mePayload = await meRes.json().catch(() => ({}))
      const usersPayload = await usersRes.json().catch(() => ({}))
      if (!meRes.ok || (mePayload?.user?.role !== "administrator" && mePayload?.user?.role !== "admin")) {
        router.push("/")
        return
      }
      setUsers((usersPayload.users || []).filter((u: ManagedUser) => u.role !== "admin" && u.role !== "administrator"))
    } finally {
      setLoading(false)
    }
  }

  async function resetMyPassword() {
    setPasswordMsg("")
    const res = await fetch(getApiPath("/auth/change-password"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPasswordMsg(payload?.error?.message || "Could not update password.")
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    setPasswordMsg("Password updated successfully.")
  }

  async function resetUserPassword(user: ManagedUser) {
    setMsg("")
    const res = await fetch(getApiPath(`/users/${user.user_id}/reset-credentials`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMsg(payload?.error?.message || "Failed to reset user password.")
      return
    }
    appendGeneratedCredential({
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
      login_id: payload.login_id,
      temporary_password: payload.temporary_password,
    })
    setMsg(`Temporary password reset for ${user.full_name}.`)
  }

  async function logout() {
    setIsExiting(true)
    await new Promise((r) => setTimeout(r, 320))
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    router.push("/")
  }

  return (
    <DashboardShell
      appName="ProctorAI Admin"
      title="Reset Password"
      subtitle="Change your own password and reset temporary passwords for users."
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password", active: true },
      ]}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
      isExiting={isExiting}
      exitMessage="Signing out of admin..."
    >
      {loading ? (
        <DashboardPanel title="Loading Reset Password">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Fetching password reset data...
          </div>
        </DashboardPanel>
      ) : null}
      {!loading ? (
      <>
      <DashboardPanel title="Reset My Password">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-blue-700" />
          <h2 className="text-base font-semibold">Admin Password</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
        </div>
        {passwordMsg ? <p className="mt-2 text-sm">{passwordMsg}</p> : null}
        <button onClick={() => void resetMyPassword()} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">
          Update Password
        </button>
      </DashboardPanel>

      <DashboardPanel title="Reset User Passwords">
        {msg ? <p className="mb-3 text-sm text-emerald-700">{msg}</p> : null}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-foreground">
                <th className="py-2 pl-3">Name</th>
                <th>Role</th>
                <th>Login ID</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b last:border-b-0">
                  <td className="py-2 pl-3">{u.full_name}</td>
                  <td>{u.role}</td>
                  <td className="font-mono">{u.username || u.registration_number}</td>
                  <td>{u.email}</td>
                  <td>
                    <button
                      onClick={() => void resetUserPassword(u)}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Reset Temporary Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
      </>
      ) : null}
    </DashboardShell>
  )
}
