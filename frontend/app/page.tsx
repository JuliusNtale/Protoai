"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { getApiPath } from "@/lib/api-url"

export default function LoginPage() {
  const router = useRouter()
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(getApiPath("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error?.message || "Login failed. Please try again.")
        setLoading(false)
        return
      }

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      const role = data.user?.role
      if (role === "lecturer") {
        router.push("/lecturer")
      } else if (role === "administrator" || role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Unable to connect to the server. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#ecf1f8] p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_65px_rgba(15,23,42,0.12)] lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#112a5b,#0d2147)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">University of Dodoma</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/95">
                <Image src="/logo.png" alt="ProctoAI logo" width={56} height={56} className="object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold">ProctoAI</h1>
                <p className="text-sm text-blue-100/80">Secure Online Examination Platform</p>
              </div>
            </div>
          </div>
          <p className="relative z-10 max-w-sm text-sm leading-7 text-blue-100/85">
            Sign in to access exam sessions, invigilation dashboards, student management, and centralized logs.
          </p>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">Access your examination portal</p>

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-id" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Login ID
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Reg No / Username / Email"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1a2d5a] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-[#1a2d5a] focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link href="/forgot-password" className="text-sm font-medium text-[#1a2d5a] hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1a2d5a] py-2.5 text-sm font-semibold text-white transition hover:bg-[#16254b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

