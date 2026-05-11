"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle, ArrowLeft, Mail, Phone } from "lucide-react"

const features = [
  { label: "Enter your registration number to find your account" },
  { label: "Choose to receive your temporary password by email" },
  { label: "Log in and change your password immediately" },
]

type Step = 1 | 2 | 3

interface LookupResult {
  email: string | null
  phone: string | null
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1)
  const [regNum, setRegNum] = useState("")
  const [lookup, setLookup] = useState<LookupResult>({ email: null, phone: null })
  const [method, setMethod] = useState<"email" | "phone">("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNum.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message || "Lookup failed. Please try again.")
        setLoading(false)
        return
      }
      if (!data.email && !data.phone) {
        setError("No recovery options found for this registration number. Please contact your administrator.")
        setLoading(false)
        return
      }
      setLookup(data)
      setMethod(data.email ? "email" : "phone")
      setStep(2)
    } catch {
      setError("Unable to connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNum.trim(), recovery_method: method }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message || "Failed to send temporary password. Please try again.")
        setLoading(false)
        return
      }
      setStep(3)
    } catch {
      setError("Unable to connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Left sidebar — identical to login page ── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between w-72 xl:w-80 shrink-0 overflow-hidden px-8 py-10"
        style={{ background: "linear-gradient(175deg, #1a2d5a 0%, #162550 60%, #0f1c3d 100%)" }}
      >
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 rounded-full opacity-20"
          style={{ width: 260, height: 260, background: "radial-gradient(circle, #2a4080, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-24 -right-10 rounded-full opacity-10"
          style={{ width: 180, height: 180, background: "radial-gradient(circle, #3b5ba8, transparent 70%)" }}
        />

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
            <h1 className="text-2xl font-bold leading-tight text-white">Proctoai</h1>
            <p className="mt-2 text-xs text-blue-200/70 leading-relaxed">
              College of Information &amp; Virtual Education
            </p>
          </div>
        </div>

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

        <p className="relative z-10 text-[10px] text-blue-300/40 tracking-wide">
          &copy; 2026 University of Dodoma &middot; v1.0
        </p>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-[#f4f5f7] px-6 py-12">
        <div className="w-full max-w-105">

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-7 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {/* ── Step 1: Enter registration number ── */}
          {step === 1 && (
            <>
              <div className="mb-7">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot password</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your registration number to find your account.
                </p>
              </div>

              <form onSubmit={handleLookup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="regnum"
                    className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase"
                  >
                    Registration Number
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

                {error && (
                  <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-md py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                  style={{ background: "#1a2d5a" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Looking up account...
                    </span>
                  ) : (
                    "Find my account →"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Choose recovery method ── */}
          {step === 2 && (
            <>
              <div className="mb-7">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Recover access</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose where to send your temporary password.
                </p>
              </div>

              <form onSubmit={handleSend} className="flex flex-col gap-5">
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {lookup.email && (
                    <label
                      className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors ${
                        method === "email" ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="recovery_method"
                        value="email"
                        checked={method === "email"}
                        onChange={() => setMethod("email")}
                        className="accent-blue-600 h-4 w-4 shrink-0"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: "rgba(26,45,90,0.08)" }}
                        >
                          <Mail className="h-4 w-4 text-[#1a2d5a]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <p className="text-xs text-gray-500 truncate">{lookup.email}</p>
                        </div>
                      </div>
                    </label>
                  )}

                  {lookup.email && lookup.phone && <div className="h-px bg-gray-100" />}

                  {lookup.phone && (
                    <label
                      className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors ${
                        method === "phone" ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="recovery_method"
                        value="phone"
                        checked={method === "phone"}
                        onChange={() => setMethod("phone")}
                        className="accent-blue-600 h-4 w-4 shrink-0"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: "rgba(26,45,90,0.08)" }}
                        >
                          <Phone className="h-4 w-4 text-[#1a2d5a]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">SMS</p>
                          <p className="text-xs text-gray-500">{lookup.phone}</p>
                          <p className="text-[11px] text-amber-600 mt-0.5">SMS delivery coming soon</p>
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  A temporary password valid for <span className="font-medium text-gray-600">30 minutes</span> will
                  be sent. Log in and change it immediately from{" "}
                  <span className="font-medium text-gray-600">Settings → Change Password</span>.
                </p>

                {error && (
                  <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-md py-2.5 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                    style={{ background: "#1a2d5a" }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending...
                      </span>
                    ) : (
                      "Send temporary password →"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(26,45,90,0.08)" }}
              >
                <CheckCircle className="h-8 w-8 text-[#1a2d5a]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Check your inbox</h2>
                <p className="mt-2 text-sm text-gray-500 max-w-xs leading-relaxed">
                  If an account matching{" "}
                  <span className="font-medium text-gray-700">{regNum}</span> exists, a temporary
                  password has been sent. It expires in 30 minutes.
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-left w-full">
                <p className="font-semibold mb-1">Important</p>
                <p>
                  After signing in with your temporary password, go to{" "}
                  <strong>Settings → Change Password</strong> immediately. Do not share your temporary
                  password with anyone.
                </p>
              </div>
              <Link
                href="/"
                className="w-full rounded-md py-3 text-sm font-semibold text-white text-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{ background: "#1a2d5a" }}
              >
                Go to login →
              </Link>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Remember your password?{" "}
            <Link href="/" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
