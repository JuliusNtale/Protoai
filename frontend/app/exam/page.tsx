"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Flag, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { io, type Socket } from "socket.io-client"
import { cn } from "@/lib/utils"
import { useBrowserLockdown } from "@/hooks/use-browser-lockdown"
import { Calculator } from "@/components/calculator"
import { getApiPath } from "@/lib/api-url"
import { ThemeToggle } from "@/components/theme-toggle"

type LiveQuestion = {
  id: number
  text: string
  options: string[]
  marks: number
  questionType: string
}

// Grid layout: 4 columns of 5 rows = 20
const COLS = 4

type AnomalyResultEvent = {
  session_id?: number | string
  calibrating?: boolean
}

type SessionTerminatedEvent = {
  session_id?: number | string
  reason?: string
}

type ManualWarningEvent = {
  session_id?: number | string
  message?: string
}

export default function ExamPage() {
  const router = useRouter()
  const examCaptureVideoRef = useRef<HTMLVideoElement>(null)
  const examMonitorVideoRef = useRef<HTMLVideoElement>(null)
  const examStreamRef = useRef<MediaStream | null>(null)
  const answersRef = useRef<Record<number, number>>({})
  const questionsRef = useRef<LiveQuestion[]>([])
  const frameCanvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const tabViolationInFlightRef = useRef(false)
  const lastTabViolationAtRef = useRef(0)
  const examStartedAtRef = useRef(Date.now())
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  // Placeholder until the real exam duration loads; see the /exams/:id fetch
  // below, which sets this to the exam's actual duration_min * 60.
  const [timeLeft, setTimeLeft] = useState(60 * 60)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  const [examScore, setExamScore] = useState<number | null>(null)
  const [timeUpModalOpen, setTimeUpModalOpen] = useState(false)
  const [leavingExam, setLeavingExam] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [securityAlert, setSecurityAlert] = useState<string | null>(null)
  const [examCameraReady, setExamCameraReady] = useState(false)
  const [examCameraError, setExamCameraError] = useState<string | null>(null)
  const [monitoringCalibrated, setMonitoringCalibrated] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTitle, setExamTitle] = useState("Exam")
  const [examDateLabel, setExamDateLabel] = useState("Scheduled session")
  const [examDurationLabel, setExamDurationLabel] = useState("—")
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)
  const [sessionLocked, setSessionLocked] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)
  const [terminatedReason, setTerminatedReason] = useState<string | null>(null)
  const [manualWarning, setManualWarning] = useState<string | null>(null)
  const { devtoolsLikelyOpen } = useBrowserLockdown({
    onBlockedAction: message => setSecurityAlert(message),
  })

  async function requestFullscreenMode() {
    const element = document.documentElement
    if (!element) return

    try {
      if (document.fullscreenElement) {
        setIsFullscreen(true)
        setFullscreenError(null)
        return
      }

      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else {
        const anyElement = element as unknown as { webkitRequestFullscreen?: () => Promise<void> | void }
        if (anyElement.webkitRequestFullscreen) {
          await anyElement.webkitRequestFullscreen()
        }
      }

      setIsFullscreen(Boolean(document.fullscreenElement))
      setFullscreenError(null)
    } catch {
      setFullscreenError("Fullscreen is required during the exam. Click the button below to continue.")
    }
  }

  async function goToDashboard() {
    setLeavingExam(true)
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignore fullscreen exit errors and continue navigation.
    }
    localStorage.removeItem("session_id")
    localStorage.removeItem("exam_id")
    localStorage.removeItem("verified_session_id")
    router.push("/dashboard")
  }

  async function attachExamStreamToVideos(stream: MediaStream) {
    const targets = [examCaptureVideoRef.current, examMonitorVideoRef.current].filter(Boolean) as HTMLVideoElement[]
    for (const video of targets) {
      if (video.srcObject !== stream) video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Ignore per-element play errors and keep trying other targets.
      }
    }
  }

  function stopExamCameraStream() {
    if (!examStreamRef.current) return
    examStreamRef.current.getTracks().forEach(track => track.stop())
    examStreamRef.current = null
  }

  // Submission (manual, time-up, or a lock) previously only set sessionLocked
  // for the lock/time-up paths, which stops the frame-capture socket loop -
  // but the actual camera hardware stream kept running (camera light stayed
  // on, resources unreleased) until the student clicked "Go to Dashboard"
  // and the page unmounted. A manual "Submit" click didn't even set
  // sessionLocked, so frames kept being sent and processed after
  // submission. Call this on every submission path so monitoring stops the
  // moment the exam is actually over, not on eventual navigation away.
  function stopMonitoring() {
    setSessionLocked(true)
    stopExamCameraStream()
    setExamCameraReady(false)
  }

  async function startExamCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setExamCameraError("Camera not supported")
      return
    }

    stopExamCameraStream()
    setExamCameraReady(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      examStreamRef.current = stream
      setExamCameraError(null)
      setExamCameraReady(true)
      await attachExamStreamToVideos(stream)
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setExamCameraError("Camera permission denied")
        return
      }
      setExamCameraError("Camera unavailable")
    }
  }

  // The visible monitor <video> only mounts once BOTH examCameraReady is true
  // AND accessChecked has resolved (the whole exam JSX, including this video
  // element, is behind an `if (!accessChecked) return <Verifying/>` guard).
  // The camera starts on mount independently of that access check, so
  // attachExamStreamToVideos's first call almost always runs before the real
  // <video> node exists yet, leaving its srcObject unset. Re-attach whenever
  // either flips, so it fires again once the element actually exists.
  useEffect(() => {
    if (!examCameraReady || !accessChecked || !examStreamRef.current) return
    void attachExamStreamToVideos(examStreamRef.current)
  }, [examCameraReady, accessChecked])

  // A stale client-only "verified_session_id" flag from ANY prior successful
  // verification would otherwise permanently bypass re-verification for this
  // session_id (e.g. an impostor who fails verification, then leaves frame
  // and re-enters, previously slipped in on a leftover flag). This re-checks
  // the authoritative, current identity_verified state on the server before
  // granting access.
  useEffect(() => {
    const rawSessionId = localStorage.getItem("session_id")
    const token = localStorage.getItem("token")
    const parsed = Number(rawSessionId)
    if (!rawSessionId || !token || !Number.isFinite(parsed) || parsed <= 0) {
      router.replace("/verify")
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(getApiPath(`/sessions/${parsed}/status`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || payload?.identity_verified !== true) {
          localStorage.removeItem("verified_session_id")
          router.replace("/verify")
          return
        }

        setSessionId(parsed)
        const rawExam = localStorage.getItem("exam_id")
        if (rawExam) {
          const parsedExam = Number(rawExam)
          if (Number.isFinite(parsedExam) && parsedExam > 0) {
            setExamId(parsedExam)
          }
        }
        setAccessChecked(true)
      } catch {
        if (!cancelled) router.replace("/verify")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!examId) {
      setLoadingQuestions(false)
      return
    }
    const token = localStorage.getItem("token")
    if (!token) {
      setLoadingQuestions(false)
      return
    }

    let mounted = true
    void (async () => {
      try {
        const res = await fetch(getApiPath(`/exams/${examId}`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok || !payload?.exam || !Array.isArray(payload?.questions)) {
          if (mounted) setLoadingQuestions(false)
          return
        }

        const mapped: LiveQuestion[] = payload.questions.map((q: any) => ({
          id: Number(q.question_id),
          text: String(q.question_text ?? ""),
          options: [q.option_a, q.option_b, q.option_c, q.option_d].filter((v: unknown) => typeof v === "string" && v.length > 0),
          marks: Number(q.marks ?? 1),
          questionType: String(q.question_type ?? "mcq"),
        }))

        if (!mounted) return
        setExamTitle(String(payload.exam.title ?? "Exam"))
        const durationMin = Number(payload.exam.duration_min ?? 60)
        setExamDurationLabel(`${durationMin} mins`)
        setTimeLeft(durationMin * 60)
        setExamDateLabel(
          payload.exam.scheduled_at
            ? new Date(payload.exam.scheduled_at).toLocaleDateString()
            : "Scheduled session"
        )
        setQuestions(mapped)
        setCurrent(0)
      } finally {
        if (mounted) setLoadingQuestions(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [examId])

  useEffect(() => {
    if (!sessionId || questions.length === 0) return
    const token = localStorage.getItem("token")
    if (!token) return

    let mounted = true
    void (async () => {
      const res = await fetch(getApiPath(`/sessions/${sessionId}/answers`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!mounted || !res.ok || !Array.isArray(payload?.answers)) return

      const restored: Record<number, number> = {}
      payload.answers.forEach((row: any) => {
        const questionId = Number(row.question_id)
        const selected = String(row.selected_answer || "").toUpperCase()
        const questionIdx = questions.findIndex(q => q.id === questionId)
        if (questionIdx < 0) return

        if (["A", "B", "C", "D"].includes(selected)) {
          restored[questionIdx] = selected.charCodeAt(0) - 65
        } else if (!Number.isNaN(Number(selected))) {
          restored[questionIdx] = Number(selected)
        }
      })

      setAnswers(restored)
    })()

    return () => {
      mounted = false
    }
  }, [sessionId, questions])

  useEffect(() => {
    if (!monitoringCalibrated) return
    const id = setInterval(() => {
      setTimeLeft(t => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [monitoringCalibrated])

  // The countdown above only clamps timeLeft at 0 - nothing was actually
  // submitting the exam when the clock ran out. Fire the auto-submit exactly
  // once when it hits zero, gated by sessionLocked so it can't double-fire.
  // This is the only automatic submission path left in the exam flow -
  // proctoring anomalies are logged for lecturer/admin review but never
  // interrupt or auto-submit the exam. The student always completes the
  // exam, either by manual submit or by running out of time.
  useEffect(() => {
    if (timeLeft > 0 || sessionLocked || !sessionId) return
    stopMonitoring()
    setShowSubmitConfirm(false)
    setTimeUpModalOpen(true)
    void submitSessionToServer()
  }, [timeLeft, sessionLocked, sessionId])

  // Safety net: if calibration never reports back (e.g. a camera/socket
  // hiccup), don't block the student from their exam indefinitely — proceed
  // anyway after a bounded wait. head_turned will just fall back to "still
  // calibrating" (never alerts) for that session rather than blocking access.
  useEffect(() => {
    if (!examCameraReady || monitoringCalibrated) return
    const timeout = setTimeout(() => setMonitoringCalibrated(true), 20000)
    return () => clearTimeout(timeout)
  }, [examCameraReady, monitoringCalibrated])

  useEffect(() => {
    function handleFullscreenChange() {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      if (active) setFullscreenError(null)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    handleFullscreenChange()
    void requestFullscreenMode()

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    void startExamCamera()

    return () => {
      stopExamCameraStream()
    }
  }, [])

  async function submitSessionToServer() {
    if (!sessionId) return
    const token = localStorage.getItem("token")
    if (!token) return

    const payloadAnswers = Object.fromEntries(
      Object.entries(answersRef.current)
        .map(([idx, optionIdx]) => {
          const question = questionsRef.current[Number(idx)]
          if (!question) return null
          const selectedAnswer = String.fromCharCode(65 + Number(optionIdx))
          return [String(question.id), selectedAnswer]
        })
        .filter((entry): entry is [string, string] => Array.isArray(entry))
    )

    const res = await fetch(getApiPath(`/sessions/${sessionId}/submit`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers: payloadAnswers }),
    })
    const payload = await res.json().catch(() => ({}))
    if (res.ok && typeof payload?.score === "number") {
      setExamScore(payload.score)
    }
  }

  async function logTabSwitchViolation(reason: "visibility_hidden" | "window_blur") {
    if (!sessionId || sessionLocked) return
    if (Date.now() - examStartedAtRef.current < 8000) return
    if (tabViolationInFlightRef.current) return
    const now = Date.now()
    if (now - lastTabViolationAtRef.current < 1500) return
    const token = localStorage.getItem("token")
    if (!token) return

    tabViolationInFlightRef.current = true
    lastTabViolationAtRef.current = now
    try {
      // Best-effort behavioural log for lecturer/admin post-exam review -
      // this never interrupts or auto-submits the student's exam.
      await fetch(getApiPath("/sessions/log"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: "tab_switch",
          metadata: { reason, source: "browser_lockdown", timestamp: new Date().toISOString() },
        }),
      })
    } catch {
      // Ignore network errors; this is a best-effort behavioural log.
    } finally {
      tabViolationInFlightRef.current = false
    }
  }

  function handleAnswer(optIdx: number) {
    setAnswers(a => ({ ...a, [current]: optIdx }))
  }

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // submitSessionToServer() reads from this ref rather than the `questions`
  // state directly, so it stays correct even if it's ever called from a
  // long-lived closure set up before questions finished loading (e.g. an
  // effect that only runs once, early).
  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  function toggleFlag() {
    setFlagged(f => {
      const s = new Set(f)
      s.has(current) ? s.delete(current) : s.add(current)
      return s
    })
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, "0")
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${h}:${m}:${sec}`
  }

  const answered = Object.keys(answers).length
  const isLast = questions.length > 0 && current === questions.length - 1
  const timerDanger = timeLeft < 5 * 60
  const q = questions[current]

  function openSubmitConfirm() {
    setShowSubmitConfirm(true)
  }

  async function handleConfirmSubmit() {
    setSubmitting(true)
    try {
      await submitSessionToServer()
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
      stopMonitoring()
      setShowCongrats(true)
    }
  }

  useEffect(() => {
    if (!examCameraReady || !sessionId || sessionLocked) return

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    let socket: Socket | null = null

    void (async () => {
      try {
        if (cancelled) return

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000"
        socket = io(wsUrl, { transports: ["websocket", "polling"] })
        socketRef.current = socket

        socket.on("connect", () => setSocketConnected(true))
        socket.on("disconnect", () => setSocketConnected(false))

        // Anomalies detected by the AI service are logged server-side for
        // lecturer/admin post-exam review; the only thing the client needs
        // from this event is the calibration signal below. The exam is
        // never auto-submitted based on proctoring anomalies.
        socket.on("anomaly_result", (event: AnomalyResultEvent) => {
          if (!event || Number(event.session_id) !== sessionId) return
          if (event.calibrating === false) {
            setMonitoringCalibrated(true)
          }
        })

        // A lecturer/admin can end this session early from the Sessions &
        // Reports tab (see /api/sessions/<id>/terminate on the backend) when
        // they judge flagged activity to be genuine misconduct. That HTTP
        // action has no direct line to this browser tab - it reaches us via
        // the AI service's socket room for this session_id (see
        // ai-service/app.py::/internal/broadcast), which our webcam_frame
        // loop has already joined.
        socket.on("session_terminated", (event: SessionTerminatedEvent) => {
          if (!event || Number(event.session_id) !== sessionId) return
          stopMonitoring()
          setTerminatedReason(event.reason || "Your session was terminated due to suspicious activity.")
        })

        // A lecturer/admin watching this session's warning count can send a
        // direct real-time warning (see /api/sessions/<id>/warn) without
        // ending the exam - unlike session_terminated above, this never
        // stops monitoring or blocks the student; it's purely informational.
        socket.on("manual_warning", (event: ManualWarningEvent) => {
          if (!event || Number(event.session_id) !== sessionId) return
          setManualWarning(event.message || "Your invigilator has flagged unusual activity. Please stay focused on your exam.")
        })

        interval = setInterval(() => {
          if (!examCaptureVideoRef.current || !frameCanvasRef.current || !socket) return
          const ctx = frameCanvasRef.current.getContext("2d")
          if (!ctx) return

          ctx.drawImage(examCaptureVideoRef.current, 0, 0, 320, 240)
          const frameBase64 = frameCanvasRef.current.toDataURL("image/jpeg", 0.6)
          socket.emit("webcam_frame", {
            session_id: sessionId,
            frame_base64: frameBase64,
            timestamp: new Date().toISOString(),
          })
        }, 2000)
      } catch {
        setSocketConnected(false)
      }
    })()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      if (socket) socket.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }, [examCameraReady, sessionId, sessionLocked])

  useEffect(() => {
    if (!sessionId || sessionLocked) return

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void logTabSwitchViolation("visibility_hidden")
      }
    }
    const onWindowBlur = () => {
      if (document.visibilityState === "visible") return
      void logTabSwitchViolation("window_blur")
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onWindowBlur)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onWindowBlur)
    }
  }, [sessionId, sessionLocked])

  // Status for each question bubble
  function bubbleStatus(i: number) {
    if (i === current) return "current"
    if (flagged.has(i)) return "flagged"
    if (answers[i] !== undefined) return "answered"
    return "unattempted"
  }

  if (!accessChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Verifying access...
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Top bar ── */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        {/* Left: title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">{examTitle}</span>
            <span className="mt-0.5 block text-xs text-slate-500">Duration: {examDurationLabel} &nbsp;&middot;&nbsp; {examDateLabel}</span>
          </div>

          <div className="order-3 flex w-full flex-col items-start sm:order-none sm:w-auto sm:items-center">
            <span className={cn(
              "font-mono text-2xl font-semibold tracking-[0.18em] leading-none transition-colors",
              timerDanger ? "text-red-500" : "text-slate-950 dark:text-white"
            )}>
              {formatTime(timeLeft)}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Time Remaining</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Calculator allowed={true} />
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 sm:flex"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", socketConnected ? "bg-emerald-500" : "bg-amber-400")} />
              {socketConnected ? "Monitoring" : "Connecting"}
            </button>
            <button
              onClick={openSubmitConfirm}
              className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 sm:px-4"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: question grid ── */}
        <aside className="hidden w-44 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 md:flex">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Questions</p>

          {/* Grid */}
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {questions.map((_, i) => {
              const status = bubbleStatus(i)
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-all",
                    status === "current" && "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950",
                    status === "answered" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
                    status === "flagged" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
                    status === "unattempted" && "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
            {[
              { cls: "bg-emerald-100 border border-emerald-200", label: "Answered" },
              { cls: "bg-slate-900", label: "Current" },
              { cls: "bg-amber-100 border border-amber-200", label: "Flagged" },
              { cls: "bg-white border border-slate-200", label: "Not Attempted" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", l.cls)} />
                <span className="text-[10px] leading-none text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main question area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-4 xl:hidden">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Camera</p>
                <p className={cn("text-sm font-semibold", examCameraReady ? "text-emerald-600" : "text-amber-600")}>
                  {examCameraReady ? "Ready" : "Starting"}
                </p>
              </div>
            </div>

            {loadingQuestions ? (
              <p className="text-sm text-gray-500">Loading exam questions...</p>
            ) : !q ? (
              <p className="text-sm text-red-500">No questions available for this exam.</p>
            ) : (
            <>
            {/* Question meta row */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Question {String(current + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {q.questionType.replace("_", " ")}
                </span>
                <span className="text-xs font-medium text-slate-500">{q.marks} Marks</span>
              </div>
            </div>

            <div className="mb-4 md:hidden">
              <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
                {questions.map((_, i) => {
                  const status = bubbleStatus(i)
                  return (
                    <button
                      key={`mobile-bubble-${i}`}
                      onClick={() => setCurrent(i)}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-all",
                        status === "current" && "border-slate-900 bg-slate-900 text-white",
                        status === "answered" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                        status === "flagged" && "border-amber-200 bg-amber-50 text-amber-700",
                        status === "unattempted" && "border-slate-200 bg-slate-50 text-slate-500"
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question text */}
            <p className="mb-6 max-w-2xl text-base font-medium leading-7 text-slate-900 dark:text-slate-100">
              {q.text}
            </p>

            {/* Options */}
            <div className="flex flex-col gap-2 max-w-2xl">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i)
                const selected = answers[current] === i
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left text-sm transition-all",
                      selected
                        ? "border-slate-900 bg-slate-50 shadow-sm dark:border-white dark:bg-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
                    )}
                  >
                    {/* Radio */}
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      selected ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white" : "border-slate-300 group-hover:border-slate-500 dark:border-slate-700"
                    )}>
                      {selected && <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />}
                    </span>
                    {/* Letter */}
                    <span className={cn(
                      "w-5 shrink-0 font-semibold text-xs",
                      selected ? "text-slate-900 dark:text-white" : "text-slate-400"
                    )}>
                      {letter}.
                    </span>
                    {/* Text */}
                    <span className={cn(
                      "leading-relaxed",
                      selected ? "font-medium text-slate-950 dark:text-white" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {opt}
                    </span>
                  </button>
                )
              })}
            </div>
            </>
            )}
          </div>

          {/* ── Bottom navigation ── */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 max-w-2xl">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0 || questions.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 sm:flex-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                onClick={toggleFlag}
                disabled={questions.length === 0}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-xs font-medium transition-colors sm:flex-none",
                  flagged.has(current)
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-300 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                )}
              >
                <Flag className="h-3.5 w-3.5" />
                {flagged.has(current) ? "Flagged for Review" : "Flag for Review"}
              </button>

              {isLast ? (
                <button
                  onClick={openSubmitConfirm}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:flex-none"
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  disabled={questions.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:flex-none"
                >
                  Next Question
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── Right sidebar: Live Monitor ── */}
        <aside className="hidden w-52 shrink-0 flex-col border-l border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Monitor</p>
            <span className={cn("h-2 w-2 rounded-full", socketConnected ? "bg-emerald-500" : "bg-amber-400")} />
          </div>

          {/* Webcam feed */}
          <div className="relative mt-3 flex aspect-video items-center justify-center overflow-hidden rounded-md bg-slate-900">
            {examCameraReady ? (
              <video
                ref={examMonitorVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <p className="px-2 text-center text-[10px] font-medium text-zinc-300">
                {examCameraError ?? "Starting camera..."}
              </p>
            )}
          </div>
          <video ref={examCaptureVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
          <canvas ref={frameCanvasRef} width={320} height={240} style={{ display: "none" }} />

          {!examCameraReady ? (
            <button
              type="button"
              onClick={() => void startExamCamera()}
              className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Retry Camera
            </button>
          ) : null}
        </aside>
      </div>

      {/* ── Environment/monitoring calibration gate ── */}
      {examCameraReady && !monitoringCalibrated && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a2d5a] dark:border-slate-700 dark:border-t-white" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Setting Up Monitoring</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Please look at your screen normally for a few seconds while we calibrate your camera. Your exam will begin automatically once this is done.
            </p>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Confirm Submission</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Are you sure you want to submit your exam? After submission, you cannot change your answers.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="rounded bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#243d73] disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-emerald-200 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <AlertTriangle className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Congratulations</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Your exam has been submitted successfully.
            </p>
            {examScore !== null && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-500">Your Score</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {examScore} / {questions.reduce((sum, q) => sum + (q.marks || 0), 0)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void goToDashboard()}
              className="mt-5 w-full rounded bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {timeUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Time&apos;s Up</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Your allotted exam time has ended and your answers have been submitted automatically.
            </p>
            {examScore !== null && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-500">Your Score</p>
                <p className="text-2xl font-bold text-amber-600">
                  {examScore} / {questions.reduce((sum, q) => sum + (q.marks || 0), 0)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void goToDashboard()}
              className="mt-5 w-full rounded bg-[#1a2d5a] py-2.5 text-sm font-semibold text-white hover:bg-[#243d73]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {terminatedReason && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-500/40 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Session Terminated</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{terminatedReason}</p>
            <button
              type="button"
              onClick={() => void goToDashboard()}
              className="mt-5 w-full rounded bg-[#1a2d5a] py-2.5 text-sm font-semibold text-white hover:bg-[#243d73]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {manualWarning && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Message from Invigilator</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{manualWarning}</p>
            <button
              type="button"
              onClick={() => setManualWarning(null)}
              className="mt-5 w-full rounded bg-[#1a2d5a] py-2.5 text-sm font-semibold text-white hover:bg-[#243d73]"
            >
              I Understand — Continue Exam
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && !leavingExam && !terminatedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">Fullscreen Required</p>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              You must stay in fullscreen mode until exam completion.
            </p>
            {fullscreenError ? (
              <p className="mt-2 text-xs text-red-400">{fullscreenError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void requestFullscreenMode()}
              className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {(devtoolsLikelyOpen || securityAlert) && !leavingExam && !terminatedReason && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">Inspection Blocked</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {devtoolsLikelyOpen
                ? "Developer tools appear to be open. Close them before continuing the exam."
                : securityAlert}
            </p>
            {!devtoolsLikelyOpen && (
              <button
                type="button"
                onClick={() => setSecurityAlert(null)}
                className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
