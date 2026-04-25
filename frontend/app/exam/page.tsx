"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Flag, ChevronLeft, ChevronRight, AlertTriangle, X, User } from "lucide-react"
import { cn } from "@/lib/utils"

const questions = [
  {
    id: 1,
    text: "Which of the following best describes the time complexity of QuickSort in the average case?",
    options: [
      "O(n²) — quadratic, sorted input worst case",
      "O(n log n) — linearithmic; expected average performance",
      "O(n) — linear, restricted inputs only",
      "O(log n) — logarithmic; applies to search not sort",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 2,
    text: "Which data structure uses FIFO (First In, First Out) ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correct: 1,
    marks: 5,
  },
  {
    id: 3,
    text: "What is the time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    correct: 2,
    marks: 5,
  },
  {
    id: 4,
    text: "Which of the following is NOT an object-oriented programming concept?",
    options: ["Inheritance", "Polymorphism", "Compilation", "Encapsulation"],
    correct: 2,
    marks: 5,
  },
  {
    id: 5,
    text: "What does SQL stand for?",
    options: [
      "Structured Query Language",
      "Simple Query Logic",
      "System Query Language",
      "Structured Question Lookup",
    ],
    correct: 0,
    marks: 5,
  },
  {
    id: 6,
    text: "Which protocol is used to send email?",
    options: ["FTP", "HTTP", "SMTP", "POP3"],
    correct: 2,
    marks: 5,
  },
  {
    id: 7,
    text: "What is a deadlock in operating systems?",
    options: [
      "A process that runs indefinitely",
      "Two processes waiting on each other indefinitely",
      "A kernel crash condition",
      "Memory overflow error",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 8,
    text: "In machine learning, overfitting refers to:",
    options: [
      "A model too simple for the data",
      "A model that memorises training data and fails on new data",
      "When training loss is very high",
      "A model with too few parameters",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 9,
    text: "Which sorting algorithm has O(n log n) average time complexity?",
    options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"],
    correct: 2,
    marks: 5,
  },
  {
    id: 10,
    text: "What is the primary purpose of a compiler?",
    options: [
      "To run source code directly",
      "To translate source code into machine code",
      "To manage memory allocation",
      "To optimise database queries",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 11,
    text: "Which HTTP method is used to update an existing resource?",
    options: ["GET", "POST", "PUT", "DELETE"],
    correct: 2,
    marks: 5,
  },
  {
    id: 12,
    text: "What is the main difference between TCP and UDP?",
    options: [
      "TCP is connectionless, UDP is connection-oriented",
      "TCP guarantees delivery; UDP does not",
      "UDP is slower than TCP",
      "TCP does not support multiplexing",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 13,
    text: "Which normal form eliminates transitive dependencies?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correct: 2,
    marks: 5,
  },
  {
    id: 14,
    text: "What is the role of an operating system kernel?",
    options: [
      "Provide a graphical user interface",
      "Manage hardware resources and system calls",
      "Compile high-level programs",
      "Store user data persistently",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 15,
    text: "Which traversal visits nodes in Left-Root-Right order?",
    options: ["Pre-order", "Post-order", "In-order", "Level-order"],
    correct: 2,
    marks: 5,
  },
  {
    id: 16,
    text: "What does the CAP theorem state?",
    options: [
      "A system can be consistent, available, and partition-tolerant simultaneously",
      "A distributed system can guarantee at most two of: Consistency, Availability, Partition tolerance",
      "Caches Always Persist data",
      "Concurrency Avoids Problems in distributed computing",
    ],
    correct: 1,
    marks: 5,
  },
  {
    id: 17,
    text: "Which design pattern defines a one-to-many dependency so that when one object changes state all dependants are notified?",
    options: ["Factory", "Singleton", "Observer", "Adapter"],
    correct: 2,
    marks: 5,
  },
  {
    id: 18,
    text: "What is the output of 5 XOR 3 in binary?",
    options: ["6", "7", "1", "2"],
    correct: 0,
    marks: 5,
  },
  {
    id: 19,
    text: "Which Python data structure is immutable?",
    options: ["List", "Dictionary", "Set", "Tuple"],
    correct: 3,
    marks: 5,
  },
  {
    id: 20,
    text: "What is virtual memory?",
    options: [
      "RAM that is soldered to the motherboard",
      "A technique that uses disk space to extend the apparent size of RAM",
      "Cache memory on the CPU",
      "A type of flash storage",
    ],
    correct: 1,
    marks: 5,
  },
]

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
  const [examCameraReady, setExamCameraReady] = useState(false)
  const [examCameraError, setExamCameraError] = useState<string | null>(null)
  const maxWarnings = 3
  const stats = useProctoringStats()

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

  const triggerWarning = useCallback(() => {
    const next = warnings + 1
    setWarnings(next)
    stats.setTabSwitches(s => s + 1)
    setWarningModal(next >= maxWarnings ? "final" : "warning")
  }, [warnings, stats])

  function handleAnswer(optIdx: number) {
    setAnswers(a => ({ ...a, [current]: optIdx }))
  }

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
  const isLast = current === questions.length - 1
  const timerDanger = timeLeft < 5 * 60
  const q = questions[current]

  function openSubmitConfirm() {
    setShowSubmitConfirm(true)
  }

  function handleConfirmSubmit() {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setShowSubmitConfirm(false)
      setShowCongrats(true)
    }, 900)
  }

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

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#f4f5f7] text-gray-800" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Top bar ── */}
      <header className="shrink-0 border-b border-gray-200 bg-[#1a2d5a] px-3 py-2 text-white sm:px-4 sm:py-1.5">
        {/* Left: title */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-white">Advanced Algorithms in Computer Science</span>
            <span className="mt-0.5 block text-[10px] text-blue-200/70">Duration: 2 hrs &nbsp;&middot;&nbsp; 24 February 2025</span>
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
            <button
              onClick={triggerWarning}
              className="hidden items-center gap-1.5 rounded border border-green-400/40 bg-green-500/20 px-2.5 py-1 text-[11px] font-medium text-green-300 transition-colors hover:bg-green-500/30 sm:flex"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              Monitoring Active
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

            {/* Question meta row */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#1a2d5a]">
                Question {String(current + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  Multiple Choice
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
            <p className="mb-6 text-sm font-medium text-gray-800 leading-relaxed max-w-2xl">
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
          </div>

          {/* ── Bottom navigation ── */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 max-w-2xl">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 sm:flex-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                onClick={toggleFlag}
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
