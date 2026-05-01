"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ScanFace, CheckCircle } from "lucide-react"

const features = [
  { label: "Face verification before every exam session" },
  { label: "Real-time gaze and behaviour monitoring" },
  { label: "Tamper-proof session logs and audit trail" },
]

export default function LoginPage() {
  const router = useRouter()
  const [regNum, setRegNum] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNum, password }),
      })

      const data = await res.json()

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
      } else if (role === "administrator") {
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
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Left sidebar ── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between w-72 xl:w-80 shrink-0 overflow-hidden px-8 py-10"
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
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-xl bg-white shadow-lg">
                <Image src="/logo.png" alt="Proctoai Logo" width={40} height={40} className="object-cover" />
              </div>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-white">
              Proctoai
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
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
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
          &copy; 2026 University of Dodoma &middot; v1.0
        </p>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-[#f4f5f7] px-6 py-12">
        <div className="w-full max-w-105">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-gray-500">Access your examination portal</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* User Name */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="regnum"
                className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase"
              >
                User Name
              </label>
              <input
                id="regnum"
                type="text"
                value={regNum}
                onChange={e => setRegNum(e.target.value)}
                placeholder="T22-03-92323"
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
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error message */}
            {error && (
              <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

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
