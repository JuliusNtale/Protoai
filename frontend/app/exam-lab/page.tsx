"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getApiPath } from "@/lib/api-url"
import { ThemeToggle } from "@/components/theme-toggle"

type BootstrapResponse = {
  token: string
  user: Record<string, unknown>
  session_id: number
  exam_id: number
  dev_credentials: {
    student_login_id: string
    lecturer_login_id: string
    password: string
  }
}

type Status = "checking" | "disabled" | "ready" | "launching" | "error"

export default function ExamLabPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("checking")
  const [error, setError] = useState<string | null>(null)
  const [lastLaunch, setLastLaunch] = useState<BootstrapResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(getApiPath("/devtools/exam-lab/status"))
        const payload = await res.json().catch(() => ({}))
        if (cancelled) return
        setStatus(res.ok && payload?.enabled === true ? "ready" : "disabled")
      } catch {
        if (!cancelled) setStatus("disabled")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Seeds (or resets) a deterministic dev student + verified active session
  // via the real backend contracts (see backend/app/devtools/routes.py),
  // then enters the exam through the actual /exam page - no duplicated UI.
  async function launch(mockMonitoring: boolean) {
    setStatus("launching")
    setError(null)
    try {
      const res = await fetch(getApiPath("/devtools/exam-lab/bootstrap"), { method: "POST" })
      const payload: BootstrapResponse = await res.json().catch(() => ({}) as BootstrapResponse)
      if (!res.ok) {
        setError((payload as unknown as { error?: { message?: string } })?.error?.message || "Exam Lab bootstrap failed.")
        setStatus("ready")
        return
      }

      localStorage.setItem("token", payload.token)
      localStorage.setItem("user", JSON.stringify(payload.user))
      localStorage.setItem("session_id", String(payload.session_id))
      localStorage.setItem("exam_id", String(payload.exam_id))
      localStorage.removeItem("verified_session_id")
      if (mockMonitoring) {
        localStorage.setItem("exam_lab_mock_monitoring", "true")
      } else {
        localStorage.removeItem("exam_lab_mock_monitoring")
      }
      document.cookie = `auth_token=${payload.token}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`

      setLastLaunch(payload)
      router.push("/exam")
    } catch {
      setError("Unable to reach the backend. Is docker-compose up?")
      setStatus("ready")
    }
  }

  return (
    <main className="relative min-h-screen bg-[linear-gradient(165deg,#ebf2fb,#dfe9f8)] text-foreground dark:bg-[linear-gradient(165deg,#0e1526,#141d33)]">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Exam Lab</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Local-only shortcut for developing the exam module. Seeds a deterministic dev student, exam, and an
            already-verified active session, then opens the real exam page.
          </p>

          {status === "checking" && (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Checking whether Exam Lab is enabled on the backend&hellip;</p>
          )}

          {status === "disabled" && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              Exam Lab is disabled on this backend. Set <code className="font-mono">ENABLE_DEV_TOOLS=true</code> and{" "}
              <code className="font-mono">FLASK_ENV=development</code> on the backend service, then reload this page.
            </div>
          )}

          {(status === "ready" || status === "launching") && (
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={status === "launching"}
                onClick={() => void launch(false)}
                className="rounded-md bg-[#1a2d5a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#243d73] disabled:opacity-60"
              >
                {status === "launching" ? "Launching…" : "Launch with Real Monitoring (camera + AI service)"}
              </button>
              <button
                type="button"
                disabled={status === "launching"}
                onClick={() => void launch(true)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {status === "launching" ? "Launching…" : "Launch with Mock Monitoring (no camera/socket)"}
              </button>
              <p className="text-xs text-slate-400">
                Re-launching resets the dev session (answers, warnings, termination state) back to a clean, active,
                verified session every time.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {lastLaunch && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <p>Dev student login: <span className="font-mono">{lastLaunch.dev_credentials.student_login_id}</span></p>
              <p>Dev lecturer login: <span className="font-mono">{lastLaunch.dev_credentials.lecturer_login_id}</span></p>
              <p>Password (both): <span className="font-mono">{lastLaunch.dev_credentials.password}</span></p>
              <p className="mt-1">Session #{lastLaunch.session_id} · Exam #{lastLaunch.exam_id}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
