"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Shield, UserPlus, Users } from "lucide-react"
import { getApiPath } from "@/lib/api-url"

type Provisioned = {
  user_id?: number
  full_name: string
  role: string
  login_id: string
  temporary_password: string
}

type ManagedUser = {
  user_id: number
  full_name: string
  registration_number: string
  username?: string | null
  email: string
  phone_number?: string | null
  role: string
  must_change_password: boolean
  is_active: boolean
}

type AuditLogRow = {
  audit_id: number
  action: string
  actor_user_id?: number | null
  actor_name?: string | null
  target_user_id?: number | null
  ip_address?: string | null
  created_at?: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [loadingMe, setLoadingMe] = useState(true)
  const [adminError, setAdminError] = useState("")

  const [role, setRole] = useState<"student" | "lecturer">("student")
  const [fullName, setFullName] = useState("")
  const [regNumber, setRegNumber] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [username, setUsername] = useState("")
  const [createError, setCreateError] = useState("")
  const [creating, setCreating] = useState(false)
  const [provisioned, setProvisioned] = useState<Provisioned[]>([])
  const [bulkJson, setBulkJson] = useState("")
  const [bulkMsg, setBulkMsg] = useState("")
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<Array<{ index: number; message: string }>>([])

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "lecturer">("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState("")
  const [auditQuery, setAuditQuery] = useState("")
  const [auditAction, setAuditAction] = useState("")

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void verifySession(rawToken)
  }, [router])

  async function verifySession(activeToken: string) {
    setLoadingMe(true)
    setAdminError("")
    try {
      const res = await fetch(getApiPath("/auth/me"), {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAdminError(payload?.error?.message || "Session expired. Please sign in again.")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }
      const user = payload?.user
      if (user?.role !== "administrator" && user?.role !== "admin") {
        router.push("/")
        return
      }
      localStorage.setItem("user", JSON.stringify(user))
      setMustChangePassword(Boolean(user?.must_change_password))
      await fetchUsers(activeToken)
      await fetchAuditLogs(activeToken)
    } finally {
      setLoadingMe(false)
    }
  }

  async function fetchUsers(activeToken = token) {
    setUsersLoading(true)
    setUsersError("")
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("query", query.trim())
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (activeFilter !== "all") params.set("active", String(activeFilter === "active"))
      const suffix = params.toString() ? `?${params.toString()}` : ""
      const res = await fetch(`${getApiPath("/users")}${suffix}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(payload?.error?.message || "Could not load users.")
        return
      }
      setUsers(payload.users || [])
    } finally {
      setUsersLoading(false)
    }
  }

  async function fetchAuditLogs(activeToken = token) {
    setAuditLoading(true)
    setAuditError("")
    try {
      const params = new URLSearchParams()
      if (auditQuery.trim()) params.set("query", auditQuery.trim())
      if (auditAction.trim()) params.set("action", auditAction.trim())
      const suffix = params.toString() ? `?${params.toString()}` : ""
      const res = await fetch(`${getApiPath("/users/audit-logs")}${suffix}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuditError(payload?.error?.message || "Could not load audit logs.")
        return
      }
      setAuditLogs(payload.audit_logs || [])
    } finally {
      setAuditLoading(false)
    }
  }

  async function submitPasswordChange() {
    setPasswordMsg("")
    if (!currentPassword || !newPassword) {
      setPasswordMsg("Provide current and new password.")
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg("New password must be at least 8 characters.")
      return
    }
    setLoadingPassword(true)
    try {
      const res = await fetch(getApiPath("/auth/change-password"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setPasswordMsg(payload?.error?.message || "Could not update password.")
        return
      }
      const rawUser = localStorage.getItem("user")
      if (rawUser) {
        const user = JSON.parse(rawUser)
        user.must_change_password = false
        localStorage.setItem("user", JSON.stringify(user))
      }
      setMustChangePassword(false)
      setCurrentPassword("")
      setNewPassword("")
      setPasswordMsg("Password updated successfully.")
    } finally {
      setLoadingPassword(false)
    }
  }

  async function provisionAccount() {
    setCreateError("")
    if (!fullName || !regNumber || !email) {
      setCreateError("full name, reg number and email are required.")
      return
    }
    if (role === "lecturer" && !username) {
      setCreateError("username is required for lecturer.")
      return
    }

    setCreating(true)
    try {
      const res = await fetch(getApiPath("/auth/provision-credentials"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          role,
          full_name: fullName,
          registration_number: regNumber,
          email,
          phone_number: phoneNumber,
          username: role === "lecturer" ? username : undefined,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setCreateError(payload?.error?.message || "Failed to create account.")
        return
      }

      setProvisioned(prev => [
        {
          user_id: payload.user?.user_id,
          full_name: payload.user?.full_name || fullName,
          role: payload.user?.role || role,
          login_id: payload.login_id,
          temporary_password: payload.temporary_password,
        },
        ...prev,
      ])
      setFullName("")
      setRegNumber("")
      setEmail("")
      setPhoneNumber("")
      setUsername("")
      await fetchUsers()
      await fetchAuditLogs()
    } finally {
      setCreating(false)
    }
  }

  async function provisionBulkAccounts() {
    setBulkMsg("")
    setBulkErrors([])
    let parsed: unknown
    try {
      parsed = JSON.parse(bulkJson)
    } catch {
      setBulkMsg("Invalid JSON format.")
      return
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setBulkMsg("Provide a non-empty JSON array of users.")
      return
    }

    setBulkCreating(true)
    try {
      const res = await fetch(getApiPath("/auth/provision-bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ users: parsed }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBulkMsg(payload?.error?.message || "Bulk provisioning failed.")
        return
      }

      const created = payload.created || []
      setBulkErrors(payload.errors || [])
      setProvisioned(prev => [
        ...created.map((entry: { user?: { full_name?: string; role?: string }; login_id?: string; temporary_password?: string }) => ({
          full_name: entry.user?.full_name || "",
          role: entry.user?.role || "",
          login_id: entry.login_id || "",
          temporary_password: entry.temporary_password || "",
        })),
        ...prev,
      ])
      setBulkMsg(`Created ${payload.created_count || 0} users, ${payload.error_count || 0} errors.`)
      await fetchUsers()
      await fetchAuditLogs()
    } finally {
      setBulkCreating(false)
    }
  }

  function exportGeneratedCredentialsCsv() {
    if (provisioned.length === 0) return
    const header = ["full_name", "role", "login_id", "temporary_password"]
    const rows = provisioned.map((row) => [
      row.full_name,
      row.role,
      row.login_id,
      row.temporary_password,
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `generated_credentials_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function toggleUserStatus(user: ManagedUser) {
    const res = await fetch(getApiPath(`/users/${user.user_id}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUsersError(payload?.error?.message || "Failed to update user status.")
      return
    }
    await fetchUsers()
    await fetchAuditLogs()
  }

  async function resetCredentials(user: ManagedUser) {
    const res = await fetch(getApiPath(`/users/${user.user_id}/reset-credentials`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUsersError(payload?.error?.message || "Failed to reset credentials.")
      return
    }
    setProvisioned(prev => [
      {
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        login_id: payload.login_id,
        temporary_password: payload.temporary_password,
      },
      ...prev,
    ])
    await fetchUsers()
    await fetchAuditLogs()
  }

  const summary = useMemo(() => {
    const students = users.filter(u => u.role === "student").length
    const lecturers = users.filter(u => u.role === "lecturer").length
    const active = users.filter(u => u.is_active).length
    return { students, lecturers, active, total: users.length }
  }, [users])

  if (loadingMe) {
    return (
      <main className="min-h-screen bg-[#f4f5f7] p-6">
        <div className="mx-auto max-w-5xl rounded-xl border bg-white p-6 text-sm text-gray-500">Validating admin session...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-700" />
            <h1 className="text-xl font-semibold">Admin Console</h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">Manage account lifecycle: provision users, enforce first-login password change, activate/deactivate accounts, and reset credentials.</p>
          {adminError && <p className="mt-2 text-sm text-red-600">{adminError}</p>}
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <StatCard label="Total Users" value={summary.total} />
          <StatCard label="Students" value={summary.students} />
          <StatCard label="Lecturers" value={summary.lecturers} />
          <StatCard label="Active Users" value={summary.active} />
        </section>

        {mustChangePassword && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <KeyRound className="h-4 w-4" />
              Change Temporary Admin Password
            </div>
            <p className="mt-1 text-sm text-amber-700">You must change your temporary password before regular admin operations.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current temporary password" className="rounded-md border p-2 text-sm" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New strong password" className="rounded-md border p-2 text-sm" />
            </div>
            {passwordMsg && <p className="mt-2 text-sm text-amber-800">{passwordMsg}</p>}
            <button onClick={submitPasswordChange} disabled={loadingPassword} className="mt-3 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </section>
        )}

        <section className="rounded-xl bg-white p-5 shadow-sm border space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Create Lecturer/Student Account</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={role} onChange={e => setRole(e.target.value as "student" | "lecturer")} className="rounded-md border p-2 text-sm">
              <option value="student">student</option>
              <option value="lecturer">lecturer</option>
            </select>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="rounded-md border p-2 text-sm" />
            <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Registration number" className="rounded-md border p-2 text-sm" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border p-2 text-sm" />
            <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone number (optional)" className="rounded-md border p-2 text-sm" />
            {role === "lecturer" && (
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (required for lecturer)" className="rounded-md border p-2 text-sm" />
            )}
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button onClick={provisionAccount} disabled={creating || mustChangePassword} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {creating ? "Creating..." : "Create Account + Generate Temporary Credentials"}
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold">Bulk Provision Accounts</h2>
          <p className="text-sm text-gray-500">Paste JSON array. Each entry: role, full_name, reg_number, email, phone_number (optional), username (required for lecturer).</p>
          <button
            onClick={() => setBulkJson(
              JSON.stringify(
                [
                  { role: "student", full_name: "Jane Doe", reg_number: "T22-03-12345", email: "jane@example.com", phone_number: "+255700000001" },
                  { role: "lecturer", full_name: "Dr John Mushi", reg_number: "L22-03-20001", email: "john.mushi@example.com", username: "john.mushi" },
                ],
                null,
                2
              )
            )}
            className="rounded border px-3 py-1.5 text-xs"
          >
            Insert Sample JSON
          </button>
          <textarea
            value={bulkJson}
            onChange={e => setBulkJson(e.target.value)}
            placeholder='[{"role":"student","full_name":"Jane Doe","reg_number":"T22-03-12345","email":"jane@example.com"}]'
            className="min-h-36 w-full rounded-md border p-2 text-sm font-mono"
          />
          {bulkMsg && <p className="text-sm text-gray-700">{bulkMsg}</p>}
          {bulkErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">Rows with errors</p>
              <ul className="mt-2 text-xs text-red-700">
                {bulkErrors.map((err, idx) => (
                  <li key={`${err.index}-${idx}`}>Row {err.index + 1}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={provisionBulkAccounts}
            disabled={bulkCreating || mustChangePassword}
            className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {bulkCreating ? "Creating..." : "Run Bulk Provisioning"}
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Manage Users</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name/email/reg number" className="rounded-md border p-2 text-sm md:col-span-2" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as "all" | "student" | "lecturer")} className="rounded-md border p-2 text-sm">
              <option value="all">all roles</option>
              <option value="student">student</option>
              <option value="lecturer">lecturer</option>
            </select>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as "all" | "active" | "inactive")} className="rounded-md border p-2 text-sm">
              <option value="all">all status</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchUsers()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={usersLoading}>
              {usersLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {usersError && <p className="text-sm text-red-600">{usersError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Name</th>
                  <th>Role</th>
                  <th>Login ID</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b">
                    <td className="py-2">{user.full_name}</td>
                    <td>{user.role}</td>
                    <td className="font-mono">{user.username || user.registration_number}</td>
                    <td>{user.email}</td>
                    <td>{user.is_active ? "active" : "inactive"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => toggleUserStatus(user)} className="rounded border px-2 py-1 text-xs">
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => resetCredentials(user)} className="rounded border px-2 py-1 text-xs">
                          Reset Credentials
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Generated Temporary Credentials</h2>
          <p className="text-sm text-gray-500 mt-1">Share manually. Each user is forced to set a new password on first login.</p>
          <div className="mt-3">
            <button
              onClick={exportGeneratedCredentialsCsv}
              disabled={provisioned.length === 0}
              className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Export Credentials CSV
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Name</th>
                  <th>Role</th>
                  <th>Login ID</th>
                  <th>Temporary Password</th>
                </tr>
              </thead>
              <tbody>
                {provisioned.map((row, idx) => (
                  <tr key={`${row.login_id}-${idx}`} className="border-b">
                    <td className="py-2">{row.full_name}</td>
                    <td>{row.role}</td>
                    <td className="font-mono">{row.login_id}</td>
                    <td className="font-mono">{row.temporary_password}</td>
                  </tr>
                ))}
                {provisioned.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={4}>No credentials generated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Security Audit Logs</h2>
          <p className="text-sm text-gray-500 mt-1">Tracks authentication and admin lifecycle actions.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={auditQuery}
              onChange={e => setAuditQuery(e.target.value)}
              placeholder="Search actor/email/action"
              className="rounded-md border p-2 text-sm"
            />
            <input
              value={auditAction}
              onChange={e => setAuditAction(e.target.value)}
              placeholder="Filter action (e.g. auth.login)"
              className="rounded-md border p-2 text-sm"
            />
          </div>
          <div className="mt-3">
            <button onClick={() => fetchAuditLogs()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={auditLoading}>
              {auditLoading ? "Loading..." : "Refresh Logs"}
            </button>
          </div>
          {auditError && <p className="mt-2 text-sm text-red-600">{auditError}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target User</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((row) => (
                  <tr key={row.audit_id} className="border-b">
                    <td className="py-2">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                    <td>{row.action}</td>
                    <td>{row.actor_name || row.actor_user_id || "-"}</td>
                    <td>{row.target_user_id || "-"}</td>
                    <td>{row.ip_address || "-"}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={5}>No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
