"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Camera,
  Monitor,
  Wifi,
  Clock,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  MousePointer,
  Flag,
  CheckCircle2,
  Info,
  Volume2,
} from "lucide-react"

const ORIENT_SECONDS = 5 * 60 // 5 minutes

const SECTIONS = [
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Exam Interface",
    color: "bg-blue-50 text-blue-700 border-blue-100",
    iconColor: "text-blue-600",
    items: [
      "Questions are shown one at a time in the centre panel.",
      "The question navigator on the left shows all question numbers colour-coded by status.",
      "Your live webcam feed is visible in the top-right corner at all times.",
      "The countdown timer at the top shows remaining time — it cannot be paused.",
    ],
  },
  {
    icon: <MousePointer className="h-5 w-5" />,
    title: "Answering Questions",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    iconColor: "text-emerald-600",
    items: [
      "Click a radio button or option to select your answer.",
      "Selected answers are highlighted in blue.",
      "Use Previous and Next Question buttons to navigate.",
      'Use "Flag for Review" to mark a question and return to it later.',
      "Answers are saved automatically — there is no manual save button.",
    ],
  },
  {
    icon: <Flag className="h-5 w-5" />,
    title: "Navigation & Submission",
    color: "bg-violet-50 text-violet-700 border-violet-100",
    iconColor: "text-violet-600",
    items: [
      "Flagged questions appear orange in the question navigator.",
      "Answered questions appear green; unattempted appear grey.",
      'Click SUBMIT only when you are ready — you cannot return after submitting.',
      "The exam auto-submits when the countdown reaches zero.",
    ],
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Proctoring Rules",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    iconColor: "text-amber-600",
    items: [
      "Keep your face centred in the camera frame at all times.",
      "Do not switch browser tabs or open other applications.",
      "Do not allow another person to appear in the camera frame.",
      "Looking away from the screen for more than 10 seconds triggers a warning.",
      "Three violations may result in automatic exam termination.",
    ],
  },
]

const CHECKS = [
  { icon: <Camera className="h-4 w-4" />,  label: "Webcam detected and active",       ok: true  },
  { icon: <Monitor className="h-4 w-4" />, label: "Screen recording enabled",          ok: true  },
  { icon: <Wifi className="h-4 w-4" />,    label: "Network connection stable",          ok: true  },
  { icon: <Volume2 className="h-4 w-4" />, label: "No audio alerts detected",          ok: true  },
]

export default function OrientPage() {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(ORIENT_SECONDS)
  const [canSkip, setCanSkip] = useState(false)
  const [starting, setStarting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Allow "Start Now" immediately but show timer
    setCanSkip(true)

    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          router.push("/exam")
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router])

  function handleBegin() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStarting(true)
    setTimeout(() => router.push("/exam"), 800)
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const secs = String(secondsLeft % 60).padStart(2, "0")
  const progress = ((ORIENT_SECONDS - secondsLeft) / ORIENT_SECONDS) * 100

  return (
    <div
      className="min-h-screen bg-[#f0f2f5]"
      style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}
    >
      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between px-6 py-3.5"
        style={{ background: "#1a2d5a" }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-300" />
          <div>
            <p className="text-sm font-bold text-white leading-none">ProctorAI</p>
            <p className="text-[10px] text-blue-300/70 mt-0.5">University of Dodoma</p>
          </div>
        </div>

        {/* Exam info */}
        <div className="hidden md:flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-4 py-1.5">
          <BookOpen className="h-3.5 w-3.5 text-blue-200" />
          <span className="text-xs font-medium text-blue-100">CS 301 — Data Structures and Algorithms</span>
        </div>

        {/* System checks */}
        <div className="flex items-center gap-3">
          {CHECKS.map((c, i) => (
            <div key={i} className="hidden lg:flex items-center gap-1">
              <span className="text-emerald-400">{c.icon}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
          ))}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-300">Monitoring Active</span>
          </div>
        </div>
      </header>

      {/* ── Main body ── */}
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6">

        {/* Hero orientation card */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">

          {/* Card header */}
          <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5"
            style={{ background: "linear-gradient(110deg, #1a2d5a 0%, #243d77 100%)" }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-blue-300" />
                <span className="text-xs font-semibold tracking-widest text-blue-300 uppercase">Familiarisation Period</span>
              </div>
              <h1 className="text-xl font-bold text-white">Exam Orientation</h1>
              <p className="text-sm text-blue-200/70 mt-1 leading-relaxed max-w-md">
                Take this time to read the exam rules, check your system, and get comfortable
                before proctoring starts. The exam begins automatically when the timer ends.
              </p>
            </div>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className="flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3 gap-2"
              >
                <Clock className="h-5 w-5 text-blue-200" />
                <span className="text-3xl font-bold text-white tabular-nums tracking-tight font-mono">
                  {mins}:{secs}
                </span>
              </div>
              <p className="text-[10px] text-blue-300/60 tracking-wide">TIME REMAINING TO REVIEW</p>
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden" style={{ minWidth: 160 }}>
                <div
                  className="h-full rounded-full bg-blue-300 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* System check strip */}
          <div className="flex flex-wrap gap-3 border-b border-gray-100 bg-gray-50 px-6 py-3">
            {CHECKS.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-emerald-500">{c.icon}</span>
                <span className="text-xs text-gray-600">{c.label}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {SECTIONS.map((section, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 flex flex-col gap-3 ${section.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={section.iconColor}>{section.icon}</span>
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                        <span className="text-xs leading-relaxed opacity-90">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Violation warning */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Important — Proctoring is Active</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your webcam and screen are being recorded from this moment. Ensure no other person is
              visible on camera, your face is well-lit, and you are in a quiet environment. Any
              violations during this orientation period are also logged.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-800">Ready to begin?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              The exam will start automatically in {mins}:{secs}. You can also start it now.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleBegin}
              disabled={starting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-70 shadow-md"
              style={{ background: "#1a2d5a" }}
            >
              {starting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Starting exam...
                </>
              ) : (
                <>
                  Start Exam Now
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
