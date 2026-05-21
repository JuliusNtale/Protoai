"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getApiPath } from "@/lib/api-url"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const [regNum, setRegNum] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const res = await fetch(getApiPath("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNum.trim(), recovery_method: "email" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error?.message || "Could not process password reset.")
        setLoading(false)
        return
      }
      setSuccess("If your account exists, a temporary password has been sent to your email.")
    } catch {
      setError("Unable to connect to the server. Please try again.")
    } finally {
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
              Reset Access,
              <br />
              Continue Securely
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#45536f] dark:text-[#b2bac7]">
              Enter your registration number and we will send a temporary password to your registered email.
            </p>
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
                <h2 className="text-lg font-semibold text-[#1f242c] dark:text-[#e8eaef]">Forgot password</h2>
              </div>
            </div>

            <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#6f737b] hover:text-[#1f242c] dark:text-[#97a0af] dark:hover:text-[#e8eaef]">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="regnum" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f737b] dark:text-[#97a0af]">
                  Registration Number
                </label>
                <input
                  id="regnum"
                  type="text"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  placeholder="T22-03-92323"
                  required
                  className="w-full rounded-xl border border-[#cfc5b2] bg-white px-3 py-2.5 text-sm text-[#20262f] outline-none transition focus:border-[#7a5f3a] focus:ring-4 focus:ring-[#e8ddca] dark:border-[#333b4c] dark:bg-[#11151d] dark:text-[#e8eaef] dark:focus:ring-[#2f3647]"
                />
              </div>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
              {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">{success}</p> : null}

              {!success ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#1e2f4d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#192740] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Sending..." : "Send temporary password"}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl border border-[#cfc5b2] bg-white py-2.5 text-sm font-semibold text-[#1e2f4d] transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#333b4c] dark:bg-[#11151d] dark:text-[#e8eaef]"
                  >
                    {loading ? "Sending..." : "Resend"}
                  </button>
                  <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-[#1e2f4d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#192740]">
                    Go to login
                  </Link>
                </div>
              )}
            </form>

            <p className="mt-5 text-center text-xs text-[#6f737b] dark:text-[#97a0af]">
              After login, change the temporary password immediately from your profile settings.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
