"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { ThemeToggle } from "@/components/theme-toggle"

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
      document.cookie = `auth_token=${data.token}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`

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
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,#ebf2fb,#dfe9f8)] text-foreground dark:bg-[linear-gradient(165deg,#0e1526,#141d33)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(26,45,90,0.14),transparent_44%),radial-gradient(circle_at_80%_85%,rgba(56,127,172,0.16),transparent_48%)]" />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex items-center px-6 py-10 md:px-12 lg:px-16">
          <div className="w-full max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5f3a] dark:text-[#b99f7b]">
              University of Dodoma
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[#1a2d5a] dark:text-[#e8eaef]" style={{ fontFamily: "'Iowan Old Style','Palatino Linotype',serif" }}>
              Trusted Examinations,
              <br />
              Institutional Integrity
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#45536f] dark:text-[#b2bac7]">
              ProctoAI protects exam integrity through guided verification, invigilation analytics, and accountable audit trails.
            </p>
            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-[#c7d5ed] bg-white/75 px-4 py-3 dark:border-[#2c3342] dark:bg-[#1a1f2b]">
                <p className="text-sm text-[#3f4f70] dark:text-[#c4cad6]">Role-based access for students, lecturers, and administrators.</p>
              </div>
              <div className="rounded-2xl border border-[#c7d5ed] bg-white/75 px-4 py-3 dark:border-[#2c3342] dark:bg-[#1a1f2b]">
                <p className="text-sm text-[#3f4f70] dark:text-[#c4cad6]">Continuous monitoring with complete session and incident traceability.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 py-10 md:px-12 lg:px-16">
          <div className="w-full max-w-md rounded-[28px] border border-[#c7d5ed] bg-white/95 p-7 shadow-[0_20px_45px_rgba(15,23,42,0.14)] dark:border-[#2e3544] dark:bg-[#181d28] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)] md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#d4deef] dark:bg-[#11151d] dark:ring-[#2e3544]">
                <Image src="/logo.png" alt="ProctoAI logo" width={56} height={56} className="object-cover" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#1a2d5a] dark:text-[#b99f7b]">ProctoAI</p>
                <h2 className="text-lg font-semibold text-[#1f242c] dark:text-[#e8eaef]">Sign in to continue</h2>
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-id" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f737b] dark:text-[#97a0af]">
                  Login ID
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter your Login ID"
                  required
                  className="w-full rounded-xl border border-[#cfc5b2] bg-white px-3 py-2.5 text-sm text-[#20262f] outline-none transition focus:border-[#7a5f3a] focus:ring-4 focus:ring-[#e8ddca] dark:border-[#333b4c] dark:bg-[#11151d] dark:text-[#e8eaef] dark:focus:ring-[#2f3647]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f737b] dark:text-[#97a0af]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#cfc5b2] bg-white px-3 py-2.5 pr-10 text-sm text-[#20262f] outline-none transition focus:border-[#7a5f3a] focus:ring-4 focus:ring-[#e8ddca] dark:border-[#333b4c] dark:bg-[#11151d] dark:text-[#e8eaef] dark:focus:ring-[#2f3647]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6f77] hover:text-[#353b44] dark:text-[#93a0b2] dark:hover:text-[#e8eaef]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link href="/forgot-password" className="text-sm font-medium text-[#7a5f3a] hover:underline dark:text-[#ceb38f]">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1e2f4d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#192740] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-[#6f737b] dark:text-[#97a0af]">
              By continuing, you agree to the university examination integrity policy.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
