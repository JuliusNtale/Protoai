"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ScanFace, CheckCircle } from "lucide-react"

const roles = ["Student", "Lecturer", "Administrator"] as const
type Role = typeof roles[number]

const roleRoutes: Record<Role, string> = {
  Student: "/dashboard",
  Lecturer: "/lecturer",
  Administrator: "/admin",
}

const features = [
  { label: "Face verification before every exam session" },
  { label: "Real-time gaze and behaviour monitoring" },
  { label: "Tamper-proof session logs and audit trail" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("b.mwakanjuki@udom.ac.tz")
  const [password, setPassword] = useState("••••••••••")
  const [role, setRole] = useState<Role>("Student")
  const [showPass, setShowPass] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push(roleRoutes[role])
    }, 1200)
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Left sidebar ── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between w-72 xl:w-80 flex-shrink-0 overflow-hidden px-8 py-10"
        style={{ background: "linear-gradient(175deg, #1a2d5a 0%, #162550 60%, #0f1c3d 100%)" }}
      >
        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 rounded-full opacity-20"
          style={{ width: 260, height: 260, background: "radial-gradient(circle, #2a4080, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-24 -right-10 rounded-full opacity-10"
          style={{ width: 180, height: 180, background: "radial-gradient(circle, #3b5ba8, transparent 70%)" }}
        />

        {/* Top branding */}
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-300 uppercase mb-3">
              University of Dodoma
            </p>
            <h1 className="text-2xl font-bold leading-tight text-white">
              AI Proctoring<br />System
            </h1>
            <p className="mt-2 text-xs text-blue-200/70 leading-relaxed">
              College of Information &amp; Virtual Education
            </p>
          </div>
        </div>

        {/* Feature list */}
        <ul className="relative z-10 flex flex-col gap-5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(99,130,220,0.25)", border: "1px solid rgba(99,130,220,0.4)" }}
              >
                <CheckCircle className="h-3 w-3 text-blue-300" />
              </span>
              <span className="text-sm text-blue-100/80 leading-snug">{f.label}</span>
            </li>
          ))}
        </ul>

        {/* Footer version */}
        <p className="relative z-10 text-[10px] text-blue-300/40 tracking-wide">
          &copy; 2025 University of Dodoma &middot; v1.0
        </p>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-[#f4f5f7] px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-gray-500">Access your examination portal</p>
          </div>

          {/* Role tabs */}
          <div className="mb-6 flex items-center gap-0 rounded-md overflow-hidden border border-gray-200 bg-white w-fit">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-4 py-1.5 text-sm font-medium transition-all focus:outline-none ${
                  role === r
                    ? "bg-gray-100 text-gray-900 shadow-inner"
                    : "text-gray-500 hover:text-gray-700 bg-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Keep signed in + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={e => setKeepSignedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm text-gray-600">Keep me signed in</span>
              </label>
              <Link
                href="#"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-md py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              style={{ background: "#1a2d5a" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign in \u2192"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* SSO */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <ScanFace className="h-4 w-4 text-gray-500" />
            University SSO
          </button>

          {/* Register link */}
          <p className="mt-7 text-center text-sm text-gray-500">
            {"Don't have an account? "}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
