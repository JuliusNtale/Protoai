"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Flag, ChevronLeft, ChevronRight, AlertTriangle, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrowserLockdown } from "@/hooks/use-browser-lockdown"
import { SystemStatusIndicators } from "@/components/system-status-indicators"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { Calculator } from "@/components/calculator"
import { getApiPath } from "@/lib/api-url"

type SocketLike = {
  on: (event: string, callback: (...args: any[]) => void) => void
  emit: (event: string, payload: unknown) => void
  disconnect: () => void
}

declare global {
  interface Window {
    io?: (url: string, options?: Record<string, unknown>) => SocketLike
  }
}

type LiveQuestion = {
  id: number
  text: string
  options: string[]
  marks: number
  questionType: string
}

// Grid layout: 4 columns of 5 rows = 20
const COLS = 4

type WarningLevel = "warning" | "final"

// Proctoring stat that animates
function useProctoringStats() {
  const [gazeDirection, setGazeDirection] = useState("On Screen")
  const [headPosition, setHeadPosition] = useState("Centred")
  const [tabSwitches, setTabSwitches] = useState(0)
  const [faceVisibility, setFaceVisibility] = useState<"Visible" | "Partially Hidden" | "Hidden">("Visible")

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random()
      if (r < 0.1) {
        setGazeDirection("Away")
        setFaceVisibility("Partially Hidden")
      } else {
        setGazeDirection("On Screen")
        setFaceVisibility("Visible")
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return { gazeDirection, headPosition, tabSwitches, setTabSwitches, faceVisibility }
}

export default function ExamPage() {
  const router = useRouter()
  const examVideoRef = useRef<HTMLVideoElement>(null)
  const examStreamRef = useRef<MediaStream | null>(null)
  const answersRef = useRef<Record<number, number>>({})
  const frameCanvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<SocketLike | null>(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  // 1h 45m = 6300 seconds — matches screenshot "01:42:33"
  const [timeLeft, setTimeLeft] = useState(1 * 60 * 60 + 45 * 60)
  const [warnings, setWarnings] = useState(0)
  const [warningModal, setWarningModal] = useState<WarningLevel | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  const [leavingExam, setLeavingExam] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [securityAlert, setSecurityAlert] = useState<string | null>(null)
  const [examCameraReady, setExamCameraReady] = useState(false)
  const [examCameraError, setExamCameraError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTitle, setExamTitle] = useState("Exam")
  const [examDateLabel, setExamDateLabel] = useState("Scheduled session")
  const [examDurationLabel, setExamDurationLabel] = useState("—")
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)
  const [sessionLocked, setSessionLocked] = useState(false)
  const maxWarnings = 3
  const stats = useProctoringStats()
  const setTabSwitches = stats.setTabSwitches
  const networkStatus = useNetworkStatus()
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
    router.push("/dashboard")
  }

  function stopExamCameraStream() {
    if (!examStreamRef.current) return
    examStreamRef.current.getTracks().forEach(track => track.stop())
    examStreamRef.current = null
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
      if (examVideoRef.current) {
        examVideoRef.current.srcObject = stream
        await examVideoRef.current.play()
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setExamCameraError("Camera permission denied")
        return
      }
      setExamCameraError("Camera unavailable")
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem("session_id")
    if (!raw) return
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) {
      setSessionId(parsed)
    }
    const rawExam = localStorage.getItem("exam_id")
    if (!rawExam) return
    const parsedExam = Number(rawExam)
    if (Number.isFinite(parsedExam) && parsedExam > 0) {
      setExamId(parsedExam)
    }
  }, [])

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
        setExamDurationLabel(`${Number(payload.exam.duration_min ?? 0)} mins`)
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
    const id = setInterval(() => {
      setTimeLeft(t => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

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

  const applyWarning = useCallback((incomingCount: number) => {
    const next = Math.max(incomingCount, 0)
    setWarnings(next)
    setTabSwitches(next)
    setWarningModal(next >= maxWarnings ? "final" : "warning")
  }, [maxWarnings, setTabSwitches])

  async function submitSessionToServer() {
    if (!sessionId) return
    const token = localStorage.getItem("token")
    if (!token) return

    const payloadAnswers = Object.fromEntries(
      Object.entries(answersRef.current)
        .map(([idx, optionIdx]) => {
          const question = questions[Number(idx)]
          if (!question) return null
          const selectedAnswer = String.fromCharCode(65 + Number(optionIdx))
          return [String(question.id), selectedAnswer]
        })
        .filter((entry): entry is [string, string] => Array.isArray(entry))
    )

    await fetch(getApiPath(`/sessions/${sessionId}/submit`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers: payloadAnswers }),
    })
  }

  async function ensureSocketClientLoaded() {
    if (window.io) return
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-socket-io-client="true"]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true })
        existing.addEventListener("error", () => reject(new Error("Failed to load Socket.IO client")), { once: true })
        return
      }

      const script = document.createElement("script")
      script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js"
      script.async = true
      script.dataset.socketIoClient = "true"
      script.addEventListener("load", () => resolve(), { once: true })
      script.addEventListener("error", () => reject(new Error("Failed to load Socket.IO client")), { once: true })
      document.head.appendChild(script)
    })
  }

  function handleAnswer(optIdx: number) {
    setAnswers(a => ({ ...a, [current]: optIdx }))
  }

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

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
      setShowCongrats(true)
    }
  }

  useEffect(() => {
    if (!examCameraReady || !sessionId || sessionLocked) return

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    let socket: SocketLike | null = null

    void (async () => {
      try {
        await ensureSocketClientLoaded()
        if (cancelled || !window.io) return

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000"
        socket = window.io(wsUrl, { transports: ["websocket", "polling"] })
        socketRef.current = socket

        socket.on("connect", () => setSocketConnected(true))
        socket.on("disconnect", () => setSocketConnected(false))

        socket.on("anomaly_result", (event) => {
          if (!event || Number(event.session_id) !== sessionId) return
          const count = Number(event.warning_count || 0)
          applyWarning(count)
          if (Array.isArray(event.anomalies) && event.anomalies.length > 0) {
            setTabSwitches(count)
          }
        })

        socket.on("session_locked", async (event) => {
          if (!event || Number(event.session_id) !== sessionId) return
          setSessionLocked(true)
          applyWarning(maxWarnings)
          await submitSessionToServer()
        })

        interval = setInterval(() => {
          if (!examVideoRef.current || !frameCanvasRef.current || !socket) return
          const ctx = frameCanvasRef.current.getContext("2d")
          if (!ctx) return

          ctx.drawImage(examVideoRef.current, 0, 0, 320, 240)
          const frameBase64 = frameCanvasRef.current.toDataURL("image/jpeg", 0.6)
          socket.emit("webcam_frame", {
            session_id: sessionId,
            frame_base64: frameBase64,
            timestamp: new Date().toISOString(),
          })
        }, 3000)
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
  }, [applyWarning, examCameraReady, maxWarnings, sessionId, sessionLocked, setTabSwitches])

  // Status for each question bubble
  function bubbleStatus(i: number) {
    if (i === current) return "current"
    if (flagged.has(i)) return "flagged"
    if (answers[i] !== undefined) return "answered"
    return "unattempted"
  }

  const faceVisibilityColor =
    stats.faceVisibility === "Visible"
      ? "text-green-500"
      : stats.faceVisibility === "Partially Hidden"
      ? "text-orange-400"
      : "text-red-500"
  const cameraStatus = examCameraReady
    ? { label: "Ready", detail: "Camera is connected", tone: "good" as const, pulse: true }
    : examCameraError
    ? { label: "Blocked", detail: examCameraError, tone: "error" as const }
    : { label: "Checking", detail: "Preparing camera access", tone: "neutral" as const }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#f4f5f7] text-gray-800" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Top bar ── */}
      <header className="shrink-0 border-b border-gray-200 bg-[#1a2d5a] px-3 py-2 text-white sm:px-4 sm:py-1.5">
        {/* Left: title */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-white">{examTitle}</span>
            <span className="mt-0.5 block text-[10px] text-blue-200/70">Duration: {examDurationLabel} &nbsp;&middot;&nbsp; {examDateLabel}</span>
          </div>

          <div className="order-3 flex w-full flex-col items-start sm:order-none sm:w-auto sm:items-center">
            <span className={cn(
              "font-mono text-xl font-bold tracking-widest leading-none transition-colors sm:text-2xl",
              timerDanger ? "text-red-400" : "text-white"
            )}>
              {formatTime(timeLeft)}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-widest text-blue-200/60">Time Remaining</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Calculator allowed={true} />
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded border border-green-400/40 bg-green-500/20 px-2.5 py-1 text-[11px] font-medium text-green-300 sm:flex"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", socketConnected ? "animate-pulse bg-green-400" : "bg-yellow-300")} />
              {socketConnected ? "Monitoring Active" : "Connecting Monitor"}
            </button>
            <button
              onClick={openSubmitConfirm}
              className="rounded bg-red-500 px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-red-600 sm:px-4"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <SystemStatusIndicators
          camera={cameraStatus}
          network={networkStatus}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: question grid ── */}
        <aside className="hidden w-44 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-3 md:flex">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Questions</p>

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
                    "flex h-8 w-8 items-center justify-center rounded text-xs font-semibold transition-all",
                    status === "current" && "bg-[#1a2d5a] text-white shadow",
                    status === "answered" && "bg-emerald-100 text-emerald-700 border border-emerald-300",
                    status === "flagged" && "bg-orange-100 text-orange-600 border border-orange-300",
                    status === "unattempted" && "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-100 pt-3">
            {[
              { cls: "bg-emerald-100 border border-emerald-300", label: "Answered" },
              { cls: "bg-[#1a2d5a]", label: "Current" },
              { cls: "bg-orange-100 border border-orange-300", label: "Flagged for Review" },
              { cls: "bg-gray-100 border border-gray-300", label: "Not Attempted" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={cn("h-3 w-3 shrink-0 rounded-sm", l.cls)} />
                <span className="text-[10px] text-gray-500 leading-none">{l.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main question area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            <div className="mb-4 grid grid-cols-2 gap-2 xl:hidden">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Warnings</p>
                <p className={cn("text-sm font-bold", warnings > 0 ? "text-orange-500" : "text-gray-700")}>
                  {warnings} / {maxWarnings}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Face Visibility</p>
                <p className={cn("text-sm font-semibold", faceVisibilityColor)}>{stats.faceVisibility}</p>
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
              <span className="text-sm font-semibold text-[#1a2d5a]">
                Question {String(current + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {q.questionType.replace("_", " ")}
                </span>
                <span className="text-xs font-semibold text-gray-500">{q.marks} Marks</span>
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
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-semibold transition-all",
                        status === "current" && "bg-[#1a2d5a] text-white shadow",
                        status === "answered" && "border border-emerald-300 bg-emerald-100 text-emerald-700",
                        status === "flagged" && "border border-orange-300 bg-orange-100 text-orange-600",
                        status === "unattempted" && "bg-gray-100 text-gray-500"
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question text */}
            <p className="mb-4 text-sm font-medium text-gray-800 leading-relaxed max-w-2xl">
              {q.text}
            </p>

            <div className="mb-6">
              <ExplainQuestion questionText={q.text} />
            </div>

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
                      "group flex w-full items-center gap-4 rounded border px-4 py-3 text-left text-sm transition-all",
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                    )}
                  >
                    {/* Radio */}
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      selected ? "border-blue-500 bg-blue-500" : "border-gray-300 group-hover:border-blue-400"
                    )}>
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    {/* Letter */}
                    <span className={cn(
                      "w-5 shrink-0 font-semibold text-xs",
                      selected ? "text-blue-700" : "text-gray-400"
                    )}>
                      {letter}.
                    </span>
                    {/* Text */}
                    <span className={cn(
                      "leading-relaxed",
                      selected ? "text-blue-900 font-medium" : "text-gray-700"
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
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 max-w-2xl">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0 || questions.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 sm:flex-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                onClick={toggleFlag}
                disabled={questions.length === 0}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded border px-4 py-2 text-xs font-medium transition-colors sm:flex-none",
                  flagged.has(current)
                    ? "border-orange-300 bg-orange-50 text-orange-600"
                    : "border-gray-300 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-500"
                )}
              >
                <Flag className="h-3.5 w-3.5" />
                {flagged.has(current) ? "Flagged for Review" : "Flag for Review"}
              </button>

              {isLast ? (
                <button
                  onClick={openSubmitConfirm}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#1a2d5a] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#243d73] sm:flex-none"
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  disabled={questions.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#1a2d5a] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#243d73] sm:flex-none"
                >
                  Next Question
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── Right sidebar: Live Monitor ── */}
        <aside className="hidden w-48 shrink-0 flex-col border-l border-gray-200 bg-white xl:flex">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Monitor</p>
          </div>

          {/* Webcam feed */}
          <div className="relative mx-4 mt-3 overflow-hidden rounded-lg bg-[#1a1a2e] aspect-video flex items-center justify-center">
            {/* Live badge */}
            <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-[8px] font-semibold uppercase text-white">Live</span>
            </div>
            {examCameraReady ? (
              <video
                ref={examVideoRef}
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
          <canvas ref={frameCanvasRef} width={320} height={240} style={{ display: "none" }} />

          {!examCameraReady ? (
            <button
              type="button"
              onClick={() => void startExamCamera()}
              className="mx-4 mt-2 rounded-md border border-gray-300 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
            >
              Retry Camera
            </button>
          ) : null}

          {/* Stats */}
          <div className="flex flex-col gap-0 mt-2 px-4 divide-y divide-gray-100">
            <StatRow label="Gaze Direction" value={stats.gazeDirection} valueColor={stats.gazeDirection === "On Screen" ? "text-green-600" : "text-red-500"} />
            <StatRow label="Head Position" value={stats.headPosition} valueColor="text-gray-800" />
            <StatRow label="Tab Switches" value={`${stats.tabSwitches} Events`} valueColor={stats.tabSwitches > 0 ? "text-red-500" : "text-gray-800"} />
            <StatRow label="Face Visibility" value={stats.faceVisibility} valueColor={faceVisibilityColor} />
          </div>

          {/* Warning count */}
          <div className="mx-4 mt-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Warnings</p>
            <p className={cn("text-lg font-bold", warnings > 0 ? "text-orange-500" : "text-gray-700")}>
              {warnings} <span className="text-xs font-medium text-gray-400">/ {maxWarnings}</span>
            </p>
          </div>
        </aside>
      </div>

      {/* ── Warning Modal ── */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cn(
            "relative w-full max-w-sm rounded-xl border bg-white p-6 shadow-2xl",
            warningModal === "final" ? "border-red-200" : "border-orange-200"
          )}>
            {warningModal !== "final" && (
              <button
                onClick={() => setWarningModal(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {warningModal === "warning" ? (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="mb-1 text-base font-bold text-gray-900">Proctoring Warning</h3>
                <p className="mb-4 text-sm text-gray-500 leading-relaxed">
                  Suspicious behaviour has been detected. Please keep your eyes on the screen and remain in the exam window.
                </p>
                <div className="mb-5 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5">
                  <span className="text-sm text-gray-600">Warnings remaining</span>
                  <span className="text-lg font-bold text-orange-500">{maxWarnings - warnings} / {maxWarnings}</span>
                </div>
                <button
                  onClick={() => setWarningModal(null)}
                  className="w-full rounded bg-[#1a2d5a] py-2.5 text-sm font-semibold text-white hover:bg-[#243d73] transition-colors"
                >
                  I Understand — Continue Exam
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-1 text-base font-bold text-gray-900">Exam Auto-Submitted</h3>
                <p className="mb-4 text-sm text-gray-500 leading-relaxed">
                  Your exam has been automatically submitted due to repeated proctoring violations. This incident has been logged.
                </p>
                <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">Total violations</p>
                  <p className="text-2xl font-bold text-red-500">{warnings} / {maxWarnings}</p>
                </div>
                <button
                  onClick={() => void goToDashboard()}
                  className="w-full rounded bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                >
                  Return to Dashboard
                </button>
              </>
            )}
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

      {!isFullscreen && !leavingExam && (
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

      {(devtoolsLikelyOpen || securityAlert) && !leavingExam && (
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

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={cn("text-xs font-semibold", valueColor)}>{value}</span>
    </div>
  )
}

function ExplainQuestion({ questionText }: { questionText: string }) {
  const [open, setOpen] = useState(false)

  function buildHint(text: string) {
    const lower = text.toLowerCase()

    if (lower.includes("time complexity")) {
      return "Compare the growth rates in the answer choices and match them to the algorithm's typical average-case performance."
    }

    if (lower.includes("protocol") || lower.includes("http") || lower.includes("tcp") || lower.includes("udp")) {
      return "Focus on the primary responsibility of each protocol and eliminate choices that describe a different network layer behavior."
    }

    if (lower.includes("sql") || lower.includes("normal form") || lower.includes("database")) {
      return "Identify the database concept being asked, then remove choices that are related but belong to another database topic."
    }

    if (lower.includes("operating system") || lower.includes("kernel") || lower.includes("deadlock")) {
      return "Think about the operating system role or process state described, then match it to the formal definition."
    }

    return "Pick out the key concept in the question, remove obviously unrelated options first, then compare the remaining choices against the exact definition."
  }

  return (
    <div className="max-w-2xl rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-blue-700"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] text-white">
          ?
        </span>
        {open ? "Hide question guide" : "Show question guide"}
      </button>
      {open ? (
        <p className="mt-3 text-sm leading-relaxed text-blue-900">
          {buildHint(questionText)}
        </p>
      ) : null}
    </div>
  )
}
