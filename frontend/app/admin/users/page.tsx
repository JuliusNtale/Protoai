"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, UserPlus, Users } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { appendGeneratedCredential } from "@/lib/generated-credentials"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"

type ManagedUser = {
  user_id: number
  full_name: string
  registration_number: string
  username?: string | null
  email: string
  role: string
  is_active: boolean
}

function statusBadge(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
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

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [uploadingByUser, setUploadingByUser] = useState<Record<number, boolean>>({})
  const [uploadMessage, setUploadMessage] = useState("")
  const [isExiting, setIsExiting] = useState(false)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "lecturer">("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})

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
      if (!res.ok || (payload?.user?.role !== "administrator" && payload?.user?.role !== "admin")) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }
      await fetchUsers(activeToken)
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

  async function provisionAccount() {
    setCreateError("")
    if (!fullName || !email) {
      setCreateError("full name and email are required.")
      return
    }
    if (role === "student" && !regNumber) {
      setCreateError("registration number is required for student.")
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
          registration_number: role === "student" ? regNumber : undefined,
          email,
          phone_number: phoneNumber,
          username: role === "lecturer" ? username : undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(payload?.error?.message || "Failed to create account.")
        return
      }
      appendGeneratedCredential({
        user_id: payload.user?.user_id,
        full_name: payload.user?.full_name || fullName,
        role: payload.user?.role || role,
        login_id: payload.login_id,
        temporary_password: payload.temporary_password,
      })
      setFullName("")
      setRegNumber("")
      setEmail("")
      setPhoneNumber("")
      setUsername("")
      await fetchUsers()
    } finally {
      setCreating(false)
    }
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
  }

  async function uploadBaselineImage(user: ManagedUser, file: File | null) {
    if (!file) return
    setUploadMessage("")
    setUploadingByUser((prev) => ({ ...prev, [user.user_id]: true }))
    try {
      const body = new FormData()
      body.append("image", file)
      const res = await fetch(getApiPath(`/images/${user.user_id}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadMessage(payload?.error?.message || "Failed to upload baseline image.")
        return
      }
      setUploadMessage(`Baseline photo updated for ${user.full_name}.`)
    } finally {
      setUploadingByUser((prev) => ({ ...prev, [user.user_id]: false }))
      if (fileInputs.current[user.user_id]) fileInputs.current[user.user_id]!.value = ""
    }
  }

  const summary = useMemo(() => {
    const students = users.filter(u => u.role === "student").length
    const lecturers = users.filter(u => u.role === "lecturer").length
    const active = users.filter(u => u.is_active).length
    return { students, lecturers, active, total: users.length }
  }, [users])

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
      title="Users"
      subtitle="Manage user accounts and student baseline images."
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users", active: true },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
    >
      {isExiting ? (
        <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground animate-pulse">Signing out...</div>
      ) : null}
      {loadingMe ? (
        <DashboardPanel title="Loading Users">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Fetching users data...
          </div>
        </DashboardPanel>
      ) : null}
      {adminError && <p className="text-sm text-red-600">{adminError}</p>}
      {!loadingMe ? (
      <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Users" value={summary.total} />
        <MetricCard label="Students" value={summary.students} />
        <MetricCard label="Lecturers" value={summary.lecturers} />
        <MetricCard label="Active Users" value={summary.active} />
      </section>

      <DashboardPanel title="Create Account">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-700" />
          <h2 className="text-base font-semibold">Create Lecturer/Student Account</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={role} onChange={e => setRole(e.target.value as "student" | "lecturer")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="student">student</option>
            <option value="lecturer">lecturer</option>
          </select>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          {role === "student" ? <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Registration number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" /> : null}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone number (optional)" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          {role === "lecturer" ? <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (required for lecturer)" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" /> : null}
        </div>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        <button onClick={provisionAccount} disabled={creating} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {creating ? "Creating..." : "Create Account + Generate Temporary Credentials"}
        </button>
      </DashboardPanel>

      <DashboardPanel title="Manage Users">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-700" />
          <h2 className="text-base font-semibold">Manage Users</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name/email/reg number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground md:col-span-2" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as "all" | "student" | "lecturer")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="all">all roles</option>
            <option value="student">student</option>
            <option value="lecturer">lecturer</option>
          </select>
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as "all" | "active" | "inactive")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="all">all status</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => void fetchUsers()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={usersLoading}>
            {usersLoading ? "Loading..." : "Refresh"}
          </button>
          <Link href="/admin/credentials" className="rounded-md border px-4 py-2 text-sm font-semibold">Open Credentials</Link>
        </div>
        {usersError && <p className="text-sm text-red-600">{usersError}</p>}
        {uploadMessage && <p className="text-sm text-emerald-700">{uploadMessage}</p>}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Login ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Baseline Photo</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
                  <td className="px-4 py-3 align-middle">{user.role}</td>
                  <td className="px-4 py-3 align-middle font-mono">{user.username || user.registration_number}</td>
                  <td className="px-4 py-3 align-middle">{user.email}</td>
                  <td className="px-4 py-3 align-middle"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusBadge(user.is_active)}`}>{user.is_active ? "active" : "inactive"}</span></td>
                  <td className="px-4 py-3 align-middle">
                    {user.role === "student" ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => { fileInputs.current[user.user_id] = el }}
                          type="file"
                          accept="image/jpeg,image/png"
                          className="hidden"
                          onChange={(event) => { void uploadBaselineImage(user, event.target.files?.[0] ?? null) }}
                        />
                        <button
                          onClick={() => fileInputs.current[user.user_id]?.click()}
                          disabled={Boolean(uploadingByUser[user.user_id])}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                        >
                          {uploadingByUser[user.user_id] ? "Uploading..." : "Upload / Update"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <button
                      onClick={() => void toggleUserStatus(user)}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? <tr><td className="px-4 py-4 text-muted-foreground" colSpan={7}>No users found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
      </>
      ) : null}
    </DashboardShell>
  )
}
