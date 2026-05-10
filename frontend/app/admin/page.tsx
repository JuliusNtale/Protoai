"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, UserPlus, KeyRound } from "lucide-react"
import { getApiPath } from "@/lib/api-url"

type Provisioned = {
  full_name: string
  role: string
  login_id: string
  temporary_password: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [loadingPassword, setLoadingPassword] = useState(false)

  const [role, setRole] = useState<"student" | "lecturer">("student")
  const [fullName, setFullName] = useState("")
  const [regNumber, setRegNumber] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [username, setUsername] = useState("")
  const [createError, setCreateError] = useState("")
  const [creating, setCreating] = useState(false)
  const [provisioned, setProvisioned] = useState<Provisioned[]>([])

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    const rawUser = localStorage.getItem("user")
    if (!rawToken || !rawUser) {
      router.push("/")
      return
    }
    const user = JSON.parse(rawUser)
    if (user?.role !== "administrator" && user?.role !== "admin") {
      router.push("/")
      return
    }
    setToken(rawToken)
    setMustChangePassword(Boolean(user?.must_change_password))
  }, [router])

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
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-700" />
            <h1 className="text-xl font-semibold">Admin Console</h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Create student and lecturer accounts, assign roles, and share generated temporary credentials manually.
          </p>
        </section>

        {mustChangePassword && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <KeyRound className="h-4 w-4" />
              Change Temporary Admin Password
            </div>
            <p className="mt-1 text-sm text-amber-700">You must change your temporary password before regular admin operations.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current temporary password"
                className="rounded-md border p-2 text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New strong password"
                className="rounded-md border p-2 text-sm"
              />
            </div>
            {passwordMsg && <p className="mt-2 text-sm text-amber-800">{passwordMsg}</p>}
            <button
              onClick={submitPasswordChange}
              disabled={loadingPassword}
              className="mt-3 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </section>
        )}

        <section className="rounded-xl bg-white p-5 shadow-sm border space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Provision Account</h2>
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
          <button
            onClick={provisionAccount}
            disabled={creating || mustChangePassword}
            className="rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Account + Generate Temporary Credentials"}
          </button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Recently Generated Credentials</h2>
          <p className="text-sm text-gray-500 mt-1">Share these manually with sample students/lecturers. Each user must change password after first login.</p>
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
      </div>
    </main>
  )
}
