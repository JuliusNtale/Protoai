"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Pencil, UserPlus, Users, X } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { appendGeneratedCredential } from "@/lib/generated-credentials"
import { DashboardPanel, DashboardShell, MetricCard } from "@/components/dashboard-shell"
import { StatusBadge } from "@/components/status-badge"

type ManagedUser = {
  user_id: number
  full_name: string
  registration_number: string
  username?: string | null
  email: string
  phone_number?: string | null
  department?: string | null
  academic_year?: string | null
  year_enrolled?: number | null
  role: string
  is_active: boolean
}

type ProgramOption = {
  program_id: number
  name: string
}

type EditUserForm = {
  full_name: string
  registration_number: string
  username: string
  email: string
  phone_number: string
  department: string
  academic_year: string
  year_enrolled: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loadingMe, setLoadingMe] = useState(true)
  const [adminError, setAdminError] = useState("")

  const [role, setRole] = useState<"student" | "lecturer" | "admin">("student")
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
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({
    full_name: "",
    registration_number: "",
    username: "",
    email: "",
    phone_number: "",
    department: "",
    academic_year: "",
    year_enrolled: "",
  })
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([])
  const [isExiting, setIsExiting] = useState(false)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "lecturer" | "admin">("all")
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
      await Promise.all([fetchUsers(activeToken), fetchDegreePrograms(activeToken)])
    } finally {
      setLoadingMe(false)
    }
  }

  async function fetchDegreePrograms(activeToken = token) {
    const res = await fetch(getApiPath("/exams/programs"), {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
    const payload = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(payload.programs)) {
      setProgramOptions(payload.programs)
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
    if ((role === "lecturer" || role === "admin") && !username) {
      setCreateError(`username is required for ${role}.`)
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
          username: role === "lecturer" || role === "admin" ? username : undefined,
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

  async function deleteUser(user: ManagedUser) {
    const ok = window.confirm(`Delete user "${user.full_name}" (${user.username || user.registration_number})? This is irreversible.`)
    if (!ok) return
    setDeletingUserId(user.user_id)
    setUsersError("")
    try {
      const res = await fetch(getApiPath(`/users/${user.user_id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(payload?.error?.message || "Failed to delete user.")
        return
      }
      await fetchUsers()
    } finally {
      setDeletingUserId(null)
    }
  }

  function openEditUser(user: ManagedUser) {
    setEditingUser(user)
    setEditError("")
    setEditSuccess("")
    setEditForm({
      full_name: user.full_name || "",
      registration_number: user.registration_number || "",
      username: user.username || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      department: user.department || "",
      academic_year: user.academic_year || "",
      year_enrolled: user.year_enrolled ? String(user.year_enrolled) : "",
    })
  }

  function closeEditUser() {
    if (savingEdit) return
    setEditingUser(null)
    setEditError("")
    setEditSuccess("")
  }

  function updateEditField(field: keyof EditUserForm, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  async function saveUserEdit() {
    if (!editingUser) return
    setEditError("")
    setEditSuccess("")
    if (!editForm.full_name.trim() || !editForm.email.trim() || !editForm.registration_number.trim()) {
      setEditError("Full name, email, and registration number are required.")
      return
    }
    if ((editingUser.role === "lecturer" || editingUser.role === "admin" || editingUser.role === "administrator") && !editForm.username.trim()) {
      setEditError("Username is required for lecturer and admin accounts.")
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(getApiPath(`/users/${editingUser.user_id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: editForm.full_name,
          registration_number: editForm.registration_number,
          username: editForm.username,
          email: editForm.email,
          phone_number: editForm.phone_number,
          department: editForm.department,
          academic_year: editForm.academic_year,
          year_enrolled: editForm.year_enrolled,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(payload?.error?.message || "Failed to update user.")
        return
      }
      setEditSuccess("User details updated.")
      setEditingUser(payload.user || editingUser)
      await fetchUsers()
    } finally {
      setSavingEdit(false)
    }
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
    const admins = users.filter(u => u.role === "admin" || u.role === "administrator").length
    const active = users.filter(u => u.is_active).length
    return { students, lecturers, admins, active, total: users.length }
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
      avatarName="Admin"
      sidebarItems={[
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users", active: true },
        { label: "Exams", href: "/admin/exams" },
        { label: "Credentials", href: "/admin/credentials" },
        { label: "Logs", href: "/admin/system-logs" },
        { label: "Reset Password", href: "/admin/reset-password" },
      ]}
      rightTopSlot={
        <button onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      }
      isExiting={isExiting}
      exitMessage="Signing out of admin..."
    >
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
        <MetricCard label="Admins" value={summary.admins} />
        <MetricCard label="Active Users" value={summary.active} />
      </section>

      <DashboardPanel title="Create Account">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-700" />
          <h2 className="text-base font-semibold">Create User Account</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={role} onChange={e => setRole(e.target.value as "student" | "lecturer" | "admin")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="student">student</option>
            <option value="lecturer">lecturer</option>
            <option value="admin">admin</option>
          </select>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          {role === "student" ? <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Registration number" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" /> : null}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone number (optional)" className="rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          {role === "lecturer" || role === "admin" ? <input value={username} onChange={e => setUsername(e.target.value)} placeholder={`Username (required for ${role})`} className="rounded-md border border-border bg-background p-2 text-sm text-foreground" /> : null}
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
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as "all" | "student" | "lecturer" | "admin")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="all">all roles</option>
            <option value="student">student</option>
            <option value="lecturer">lecturer</option>
            <option value="admin">admin</option>
          </select>
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as "all" | "active" | "inactive")} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">
            <option value="all">all status</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div className="mt-3 mb-5 flex gap-2">
          <button onClick={() => void fetchUsers()} className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={usersLoading}>
            {usersLoading ? "Loading..." : "Refresh"}
          </button>
          <Link href="/admin/credentials" className="rounded-md border px-4 py-2 text-sm font-semibold">Open Credentials</Link>
        </div>
        {usersError && <p className="text-sm text-red-600">{usersError}</p>}
        {uploadMessage && <p className="text-sm text-emerald-700">{uploadMessage}</p>}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Login ID</th>
                <th className="px-4 py-3">Degree / Department</th>
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
                  <td className="max-w-[260px] px-4 py-3 align-middle text-muted-foreground">{user.department || "-"}</td>
                  <td className="px-4 py-3 align-middle">{user.email}</td>
                  <td className="px-4 py-3 align-middle"><StatusBadge value={user.is_active ? "active" : "inactive"} /></td>
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
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditUser(user)}
                        disabled={deletingUserId === user.user_id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => void toggleUserStatus(user)}
                        disabled={deletingUserId === user.user_id}
                        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => void deleteUser(user)}
                        disabled={deletingUserId === user.user_id}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingUserId === user.user_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? <tr><td className="px-4 py-4 text-muted-foreground" colSpan={8}>No users found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Edit</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">Edit User Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update profile and login identifiers for {editingUser.full_name}.
                </p>
              </div>
              <button
                onClick={closeEditUser}
                disabled={savingEdit}
                className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[72vh] gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Full Name</span>
                <input
                  value={editForm.full_name}
                  onChange={(e) => updateEditField("full_name", e.target.value)}
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input
                  value={editForm.email}
                  onChange={(e) => updateEditField("email", e.target.value)}
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Registration Number</span>
                <input
                  value={editForm.registration_number}
                  onChange={(e) => updateEditField("registration_number", e.target.value)}
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Username</span>
                <input
                  value={editForm.username}
                  onChange={(e) => updateEditField("username", e.target.value)}
                  placeholder={editingUser.role === "student" ? "Optional for students" : "Required"}
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Phone Number</span>
                <input
                  value={editForm.phone_number}
                  onChange={(e) => updateEditField("phone_number", e.target.value)}
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">
                  {editingUser.role === "student" ? "Degree Program" : "Department"}
                </span>
                {editingUser.role === "student" ? (
                  <select
                    value={editForm.department}
                    onChange={(e) => updateEditField("department", e.target.value)}
                    className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                  >
                    <option value="">Select Degree Program</option>
                    {programOptions.map((program) => (
                      <option key={program.program_id} value={program.name}>{program.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editForm.department}
                    onChange={(e) => updateEditField("department", e.target.value)}
                    className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                  />
                )}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Academic Year</span>
                <input
                  value={editForm.academic_year}
                  onChange={(e) => updateEditField("academic_year", e.target.value)}
                  placeholder="e.g. Year 3"
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Year Enrolled</span>
                <input
                  value={editForm.year_enrolled}
                  onChange={(e) => updateEditField("year_enrolled", e.target.value)}
                  placeholder="e.g. 2022"
                  inputMode="numeric"
                  className="rounded-md border border-border bg-background p-2 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="border-t border-border px-6 py-4">
              {editError ? <p className="mb-3 text-sm text-red-600">{editError}</p> : null}
              {editSuccess ? <p className="mb-3 text-sm text-emerald-700">{editSuccess}</p> : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={closeEditUser}
                  disabled={savingEdit}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void saveUserEdit()}
                  disabled={savingEdit}
                  className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
      ) : null}
    </DashboardShell>
  )
}
