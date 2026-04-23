"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

// ─── phase machine ────────────────────────────────────────────────────────────
type Phase = "idle" | "scanning" | "move_up" | "move_down" | "move_left" | "move_right" | "done"

const PHASE_SEQUENCE: Phase[] = [
  "idle", "scanning", "move_up", "move_down", "move_left", "move_right", "done",
]

// Visible steps shown in the sidebar (subset of phases, user-friendly)
const STEPS: { phase: Phase; label: string; description: string }[] = [
  { phase: "scanning",   label: "Face Detection",       description: "Hold your face centred and still" },
  { phase: "move_up",    label: "Look Up",              description: "Slowly tilt your head upward" },
  { phase: "move_down",  label: "Look Down",            description: "Slowly tilt your head downward" },
  { phase: "move_left",  label: "Look Left",            description: "Slowly tilt your head to the left" },
  { phase: "move_right", label: "Look Right",           description: "Slowly tilt your head to the right" },
]

const PHASE_DURATIONS: Record<Phase, number> = {
  idle: 2500,
  scanning: 5000,
  move_up: 4000,
  move_down: 4000,
  move_left: 4000,
  move_right: 4000,
  done: 0,
}

const PHASE_HINTS: Record<Phase, string> = {
  idle:       "Position your face in the frame",
  scanning:   "Hold still — scanning your face",
  move_up:    "Slowly tilt your head up",
  move_down:  "Slowly tilt your head down",
  move_left:  "Slowly tilt your head left",
  move_right: "Slowly tilt your head right",
  done:       "Face ID Set Up",
}

// Arc segment angles for each move phase
const SEGMENT_RANGES: Record<string, [number, number]> = {
  scanning:   [0, 360],
  move_up:    [315, 45],
  move_down:  [135, 225],
  move_left:  [225, 315],
  move_right: [45, 135],
}

export default function VerifyPage() {
  const router = useRouter()
  const pageRef = useRef<HTMLDivElement>(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [segmentsFilled, setSegmentsFilled] = useState<Set<string>>(new Set())
  const [scanProgress, setScanProgress] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const phase = PHASE_SEQUENCE[phaseIndex]
  const isDone = phase === "done"

  function stopCameraStream() {
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  async function requestFullscreenMode() {
    const element = pageRef.current
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
      setFullscreenError("Fullscreen is required. Click the button below to continue in fullscreen mode.")
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.")
      return
    }

    stopCameraStream()
    setCameraReady(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      setCameraError(null)
      setCameraReady(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Allow access to continue face verification.")
        return
      }
      setCameraError("Unable to access camera. Close other apps using webcam and try again.")
    }
  }

  useEffect(() => {
    void startCamera()

    return () => {
      stopCameraStream()
    }
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

  // advance through phases
  useEffect(() => {
    if (isDone) return
    const duration = PHASE_DURATIONS[phase]
    if (duration === 0) return

    // progress animation
    startRef.current = null
    setScanProgress(0)

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      setScanProgress(Math.min(elapsed / duration, 1))
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    const timer = setTimeout(() => {
      setSegmentsFilled(prev => {
        const next = new Set(prev)
        if (phase !== "idle") next.add(phase)
        return next
      })
      setPhaseIndex(i => i + 1)
    }, duration)

    return () => {
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [phase, isDone])

  // ─── SVG ring geometry ──────────────────────────────────────────────────────
  const cx = 140
  const cy = 140
  const R = 118
  const STROKE = 5

  function polarToXY(angleDeg: number): [number, number] {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return [cx + R * Math.cos(rad), cy + R * Math.sin(rad)]
  }

  function arcPath(startDeg: number, endDeg: number): string {
    // Normalise so we always go clockwise
    let s = ((startDeg % 360) + 360) % 360
    let e = ((endDeg % 360) + 360) % 360
    if (e <= s) e += 360
    const sweep = e - s
    const large = sweep > 180 ? 1 : 0
    const [sx, sy] = polarToXY(s)
    const [ex, ey] = polarToXY(s + sweep)
    return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`
  }

  // Build the active arc for the current phase with animated progress
  function currentArcPath(): string | null {
    const range = SEGMENT_RANGES[phase]
    if (!range) return null
    const [start, end] = range
    // normalise end relative to start
    let s = ((start % 360) + 360) % 360
    let e = ((end % 360) + 360) % 360
    if (e <= s) e += 360
    const totalSweep = e - s
    const partial = totalSweep * scanProgress
    if (partial < 0.5) return null
    const [sx, sy] = polarToXY(s)
    const [ex, ey] = polarToXY(s + partial)
    const large = partial > 180 ? 1 : 0
    return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`
  }

  // Completed segment arcs
  const completedSegments = Array.from(segmentsFilled)
    .filter(k => k !== "scanning")
    .map(k => arcPath(...(SEGMENT_RANGES[k] as [number, number])))

  const fullRingPath = arcPath(0, 360)

  const hint = PHASE_HINTS[phase]

  // Arrow direction indicator
  const arrowMap: Record<string, string> = {
    move_up: "↑",
    move_down: "↓",
    move_left: "←",
    move_right: "→",
  }

  // Derive step status
  const activeStepIndex = STEPS.findIndex(s => s.phase === phase)
  const completedStepPhases = Array.from(segmentsFilled)

  return (
    <div ref={pageRef} className="flex min-h-screen bg-black select-none">

      {/* ── Left step sidebar ── */}
      <aside className="hidden lg:flex flex-col justify-between w-72 xl:w-80 shrink-0 border-r border-white/5 px-8 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">ProctorAI</p>
          <h2 className="text-lg font-semibold text-white leading-snug">Identity Verification</h2>
          <p className="text-xs text-zinc-500 leading-relaxed mt-1">
            Follow the on-screen instructions to verify your identity before accessing your exam.
          </p>
        </div>

        {/* Step list */}
        <ol className="flex flex-col gap-0 mt-8 flex-1">
          {STEPS.map((step, i) => {
            const isCompleted = completedStepPhases.includes(step.phase)
            const isActive = step.phase === phase
            const isPending = !isCompleted && !isActive

            return (
              <li key={step.phase} className="flex gap-3">
                {/* Connector line + icon */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                    isCompleted && "bg-emerald-500/20",
                    isActive && "bg-white/10",
                    isPending && "bg-white/5",
                    isDone && "bg-emerald-500/20",
                  )}>
                    {isDone || isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-700" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "w-px flex-1 my-1 transition-colors duration-500",
                      isCompleted || isDone ? "bg-emerald-500/30" : "bg-white/8",
                    )} style={{ minHeight: 28 }} />
                  )}
                </div>

                {/* Text */}
                <div className="pb-7">
                  <p className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    isDone || isCompleted ? "text-emerald-300" : isActive ? "text-white" : "text-zinc-600",
                  )}>
                    {step.label}
                  </p>
                  {isActive && !isDone && (
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{step.description}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {/* Overall progress bar */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>Progress</span>
            <span>{isDone ? 100 : Math.round((completedStepPhases.filter(p => p !== "idle").length / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{
                width: isDone
                  ? "100%"
                  : `${(completedStepPhases.filter(p => p !== "idle").length / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </aside>

      {/* ── Main face area ── */}
      <main className="flex flex-1 flex-col items-center justify-between px-6 py-14">

      {/* Top label (mobile only) */}
      <div className="flex flex-col items-center gap-1 pt-4 lg:hidden">
        <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">ProctorAI</p>
      </div>

      {/* Center — face + ring */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10">

        {/* SVG face ring */}
        <div className="relative" style={{ width: 280, height: 280 }}>
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
            {/* Background dim ring */}
            <path
              d={fullRingPath}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
            />

            {/* Done: full green ring */}
            {isDone && (
              <path
                d={fullRingPath}
                stroke="#34d399"
                strokeWidth={STROKE + 1}
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* Completed segments (white) */}
            {!isDone && completedSegments.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke="white"
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {/* Active partial arc */}
            {!isDone && (() => {
              const d = currentArcPath()
              if (!d) return null
              const isInitialScan = phase === "scanning"
              return (
                <path
                  d={d}
                  stroke={isInitialScan ? "rgba(255,255,255,0.5)" : "white"}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                />
              )
            })()}
          </svg>

          {/* Face oval cutout — centre of ring */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ top: 0, left: 0 }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: 176,
                height: 208,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {/* Simulated face silhouette */}
              {cameraReady ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                  <p className="text-xs text-zinc-300">
                    {cameraError ?? "Starting camera..."}
                  </p>
                </div>
              )}

              {/* Scan line — only during scanning phase */}
              {phase === "scanning" && (
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                    animation: "scanLine 1.4s ease-in-out infinite",
                    top: 0,
                  }}
                />
              )}

              {/* Done checkmark */}
              {isDone && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="27" stroke="#34d399" strokeWidth="2" />
                    <path d="M16 28.5l8 8 16-16" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Motion arrow overlay */}
          {arrowMap[phase] && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: "arrowPulse 0.7s ease-in-out infinite alternate" }}
            >
              <span
                className="text-4xl font-thin text-white/30 select-none"
                style={{
                  marginTop: phase === "move_up" ? -90 : phase === "move_down" ? 90 : 0,
                  marginLeft: phase === "move_left" ? -90 : phase === "move_right" ? 90 : 0,
                }}
              >
                {arrowMap[phase]}
              </span>
            </div>
          )}
        </div>

        {/* Hint text */}
        <div className="flex flex-col items-center gap-2 text-center" style={{ minHeight: 64 }}>
          {isDone ? (
            <>
              <p className="text-2xl font-semibold text-white tracking-tight">Face ID Set Up</p>
              <p className="text-sm text-zinc-400 max-w-55 leading-relaxed">
                Your identity has been confirmed. Click continue to enter your exam now.
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-white tracking-tight text-balance">{hint}</p>
              {phase !== "idle" && (
                <p className="text-sm text-zinc-500">
                  {phase === "scanning"
                    ? "Keep your face centred and still"
                    : "Move slowly until the ring fills"}
                </p>
              )}
              {cameraError ? (
                <p className="text-xs text-red-400">{cameraError}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        {isDone ? (
          <Button
            onClick={() => router.push("/exam")}
            className="w-full h-14 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-colors"
          >
            Continue to Exam
          </Button>
        ) : (
          <>
            {!cameraReady ? (
              <button
                onClick={() => void startCamera()}
                className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Retry Camera
              </button>
            ) : null}
            <button
              onClick={() => router.push("/exam")}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Skip Face Scan
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; opacity: 0.8; }
          50%  { top: 82%; opacity: 1; }
          100% { top: 10%; opacity: 0.8; }
        }
        @keyframes arrowPulse {
          from { opacity: 0.2; }
          to   { opacity: 0.55; }
        }
      `}</style>
      </main>

      {!isFullscreen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">Fullscreen Required</p>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              Face verification must run in fullscreen mode.
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
