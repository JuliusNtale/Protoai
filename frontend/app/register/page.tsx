"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle, User, Hash, Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", regNum: "", email: "", password: "" })

  function handleCapture() {
    setCapturing(true)
    setTimeout(() => {
      setCapturing(false)
      setCaptured(true)
    }, 2000)
  }

  function handleRetake() {
    setCaptured(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push("/verify")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="guest" />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Student Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your account and register your face for identity verification.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Form fields */}
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-foreground">Personal Information</h2>

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="name">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                    required
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="regnum">Registration Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="regnum"
                    type="text"
                    value={form.regNum}
                    onChange={e => setForm(f => ({ ...f, regNum: e.target.value }))}
                    placeholder="CS/2021/0042"
                    required
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="email">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@university.edu"
                    required
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Create a strong password"
                    required
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters with uppercase and numbers.</p>
              </div>
            </div>

            {/* Right: Webcam capture */}
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-foreground">Face Registration</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Position your face within the guide and ensure good lighting. Your face will be used for identity verification during exams.
              </p>

              {/* Camera view */}
              <div className="relative overflow-hidden rounded-xl bg-zinc-900 aspect-[4/3]">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)" }} />

                  {captured ? (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500 bg-zinc-700">
                        <CheckCircle className="h-10 w-10 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-400">Face Captured</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700">
                        <Camera className="h-10 w-10 text-zinc-400" />
                      </div>
                      {capturing && (
                        <p className="text-xs font-medium text-yellow-400 animate-pulse">Capturing…</p>
                      )}
                    </>
                  )}
                </div>

                {/* Face alignment oval guide */}
                {!captured && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-36 rounded-full border-2 border-dashed border-zinc-400/60" />
                  </div>
                )}

                {/* Corner brackets */}
                <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-primary" />
                <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-primary" />
                <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-primary" />

                {/* Live dot */}
                <div className="absolute left-3 top-3 mt-7 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">Live</span>
                </div>
              </div>

              {/* Capture success indicator */}
              {captured && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Face captured successfully</p>
                    <p className="text-xs text-muted-foreground">Your biometric data has been saved.</p>
                  </div>
                </div>
              )}

              {/* Capture / Retake button */}
              <div className="flex gap-3">
                {!captured ? (
                  <Button
                    type="button"
                    onClick={handleCapture}
                    disabled={capturing}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {capturing ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Capturing…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><Camera className="h-4 w-4" /> Capture Face</span>
                    )}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handleRetake} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" /> Retake
                  </Button>
                )}
              </div>

              {/* Tips */}
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><span className="text-primary">•</span> Ensure your face is well-lit</li>
                <li className="flex items-center gap-1.5"><span className="text-primary">•</span> Look directly at the camera</li>
                <li className="flex items-center gap-1.5"><span className="text-primary">•</span> Remove glasses if possible</li>
              </ul>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/" className="font-medium text-primary hover:underline">Sign In</Link>
            </p>
            <Button
              type="submit"
              disabled={!captured || loading}
              className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Registering…
                </span>
              ) : "Complete Registration"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
