"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SystemStatusIndicators } from "@/components/system-status-indicators"
import { useBrowserLockdown } from "@/hooks/use-browser-lockdown"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

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

const HOLD_DURATION_MS = 1200
const MONITOR_INTERVAL_MS = 700
const MONITOR_REQUEST_TIMEOUT_MS = 6000
const MAX_CONSECUTIVE_MONITOR_ERRORS = 4

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
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [segmentsFilled, setSegmentsFilled] = useState<Set<string>>(new Set())
  const [scanProgress, setScanProgress] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [videoFeedReady, setVideoFeedReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [securityAlert, setSecurityAlert] = useState<string | null>(null)
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [telemetry, setTelemetry] = useState<{ yaw: number; pitch: number; anomalies: string[] } | null>(null)
  const [lightingStatus, setLightingStatus] = useState<"good" | "low" | "high" | "flat">("good")
  const [lightingHint, setLightingHint] = useState<string | null>(null)
  const [monitorErrors, setMonitorErrors] = useState(0)
  const phaseHoldStartRef = useRef<number | null>(null)
  const monitorLockRef = useRef(false)
  const monitorAbortRef = useRef<AbortController | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const networkStatus = useNetworkStatus()
  const { devtoolsLikelyOpen } = useBrowserLockdown({
    onBlockedAction: message => setSecurityAlert(message),
  })

  const phase = PHASE_SEQUENCE[phaseIndex]
  const isDone = phase === "done"
  const cameraStatus = cameraReady
    ? { label: "Ready", detail: "Camera is connected", tone: "good" as const, pulse: true }
    : cameraError
    ? { label: "Blocked", detail: cameraError, tone: "error" as const }
    : { label: "Checking", detail: "Preparing camera access", tone: "neutral" as const }

  function resolveAiBaseUrl() {
    const configured = (process.env.NEXT_PUBLIC_AI_URL || "").trim().replace(/\/+$/, "")
    if (typeof window === "undefined") return configured || "http://localhost:8000"
    if (!configured) return window.location.origin
    if (window.location.protocol === "https:" && configured.startsWith("http://")) {
      return window.location.origin
    }
    return configured
  }

  function stopCameraStream() {
    if (monitorAbortRef.current) {
      monitorAbortRef.current.abort()
      monitorAbortRef.current = null
    }
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  function evaluateLighting(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let sum = 0
    let sumSq = 0
    const pixels = canvas.width * canvas.height
    for (let i = 0; i < image.length; i += 4) {
      const y = 0.2126 * image[i] + 0.7152 * image[i + 1] + 0.0722 * image[i + 2]
      sum += y
      sumSq += y * y
    }
    const mean = sum / pixels
    const variance = Math.max(sumSq / pixels - mean * mean, 0)
    const std = Math.sqrt(variance)

    if (mean > 190) {
      setLightingStatus("high")
      setLightingHint("Background is too bright. Face a softer front light and avoid strong backlight.")
      return false
    }
    if (mean < 55) {
      setLightingStatus("low")
      setLightingHint("Scene is too dark. Increase front lighting on your face.")
      return false
    }
    if (std < 28) {
      setLightingStatus("flat")
      setLightingHint("Image contrast is too low. Improve lighting and reduce glare.")
      return false
    }
    setLightingStatus("good")
    setLightingHint(null)
    return true
  }

  async function attachStreamToVideo() {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    try {
      await video.play()
      setVideoFeedReady(true)
    } catch {
      setVideoFeedReady(false)
    }
  }

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
      setFullscreenError("Fullscreen is required. Click the button below to continue in fullscreen mode.")
    }
  }

  async function startCamera() {
    if (!window.isSecureContext) {
      setCameraError("Camera requires a secure origin. Use https://192.168.0.19:3000 or open the app on localhost.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.")
      return
    }

    stopCameraStream()
    setCameraReady(false)
    setVideoFeedReady(false)
    setMonitorErrors(0)
    setPhaseError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      setCameraError(null)
      setCameraReady(true)
      await attachStreamToVideo()
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
    if (!cameraReady) return
    void attachStreamToVideo()
  }, [cameraReady])

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

  function nextPhase() {
    setSegmentsFilled(prev => {
      const next = new Set(prev)
      if (phase !== "idle") next.add(phase)
      return next
    })
    setScanProgress(0)
    setPhaseError(null)
    phaseHoldStartRef.current = null
    setPhaseIndex(i => Math.min(i + 1, PHASE_SEQUENCE.length - 1))
  }

  function isPhaseConditionSatisfied(currentPhase: Phase, yaw: number, pitch: number, facePresent: boolean) {
    if (!facePresent) return false
    if (currentPhase === "idle") return true
    // Face detection should verify stable face presence without over-strict pose gating.
    if (currentPhase === "scanning") return true
    if (currentPhase === "move_up") return pitch <= -15
    if (currentPhase === "move_down") return pitch >= 15
    // Yaw sign is inverted relative to user-facing prompt direction in our current feed.
    // Swap left/right checks so instruction text matches real movement.
    if (currentPhase === "move_left") return yaw >= 18
    if (currentPhase === "move_right") return yaw <= -18
    return false
  }

  // strict phase validation loop driven by AI monitor output
  useEffect(() => {
    if (isDone || !cameraReady || !videoFeedReady || cameraError) return

    const runValidation = async () => {
      if (monitorLockRef.current) return
      if (!videoRef.current) return
      if (!streamRef.current || streamRef.current.getVideoTracks().every(t => t.readyState !== "live")) {
        setPhaseError("Camera stream paused. Reconnect camera to continue.")
        setCameraReady(false)
        return
      }
      const hasRenderableFrame =
        videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      if (!hasRenderableFrame) {
        setPhaseError("Waiting for camera feed...")
        return
      }
      monitorLockRef.current = true
      try {
        const canvas = document.createElement("canvas")
        canvas.width = 480
        canvas.height = 360
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        evaluateLighting(canvas, ctx)
        const frameBase64 = canvas.toDataURL("image/jpeg", 0.85)

        const rawSessionId = localStorage.getItem("session_id")
        const sessionId = rawSessionId && Number(rawSessionId) > 0 ? Number(rawSessionId) : 0
        if (!sessionId) {
          setPhaseError("No active exam session found. Restart from dashboard.")
          return
        }
        const aiBase = resolveAiBaseUrl()
        const controller = new AbortController()
        monitorAbortRef.current = controller
        const timeout = setTimeout(() => controller.abort(), MONITOR_REQUEST_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch(`${aiBase}/monitor-frame`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ session_id: sessionId || 1, frame_base64: frameBase64 }),
          })
        } finally {
          clearTimeout(timeout)
        }
        monitorAbortRef.current = null
        if (!response.ok) {
          setMonitorErrors(prev => prev + 1)
          phaseHoldStartRef.current = null
          setScanProgress(0)
          setPhaseError("Unable to analyze camera frame. Keep camera active and retry.")
          return
        }
        setMonitorErrors(0)

        const result = await response.json()
        const anomalies: string[] = Array.isArray(result?.anomalies) ? result.anomalies : []
        const pose = result?.head_pose || {}
        const yaw = Number(pose?.yaw || 0)
        const pitch = Number(pose?.pitch || 0)
        setTelemetry({ yaw, pitch, anomalies })
        const facePresent = !anomalies.includes("face_absent")
        const satisfied = isPhaseConditionSatisfied(phase, yaw, pitch, facePresent)

        if (!facePresent) {
          setPhaseError("Face not detected. Position your face inside the frame.")
        } else if (!satisfied) {
          if (phase === "scanning") setPhaseError("Hold your face still and centered.")
          if (phase === "move_up") setPhaseError("Tilt your head up to continue.")
          if (phase === "move_down") setPhaseError("Tilt your head down to continue.")
          if (phase === "move_left") setPhaseError("Tilt your head left to continue.")
          if (phase === "move_right") setPhaseError("Tilt your head right to continue.")
        } else {
          setPhaseError(null)
        }

        if (!satisfied) {
          phaseHoldStartRef.current = null
          setScanProgress(0)
          return
        }

        const now = performance.now()
        if (phaseHoldStartRef.current === null) phaseHoldStartRef.current = now
        const elapsed = now - phaseHoldStartRef.current
        setScanProgress(Math.min(elapsed / HOLD_DURATION_MS, 1))

        if (elapsed >= HOLD_DURATION_MS) {
          nextPhase()
        }
      } catch {
        setMonitorErrors(prev => prev + 1)
        phaseHoldStartRef.current = null
        setScanProgress(0)
        setPhaseError("Live verification stream interrupted. Check network, HTTPS routing, and camera, then retry.")
      } finally {
        monitorLockRef.current = false
      }
    }

    const interval = setInterval(() => {
      void runValidation()
    }, MONITOR_INTERVAL_MS)
    void runValidation()

    return () => {
      clearInterval(interval)
    }
  }, [phase, isDone, cameraReady, videoFeedReady, cameraError])

  useEffect(() => {
    if (monitorErrors < MAX_CONSECUTIVE_MONITOR_ERRORS) return
    setPhaseError("Verification stream unstable. Restarting camera...")
    void startCamera()
  }, [monitorErrors])

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

  async function handleContinueToExam() {
    if (!videoRef.current || !cameraReady || !videoFeedReady || isVerifyingIdentity) return
    if (!isDone) {
      setIdentityError("Complete all verification steps before continuing.")
      return
    }

    setIdentityError(null)
    setIsVerifyingIdentity(true)

    try {
      const rawUser = localStorage.getItem("user")
      const rawSessionId = localStorage.getItem("session_id")
      if (!rawUser) {
        setIdentityError("Session expired. Please sign in again.")
        return
      }
      if (!rawSessionId || !Number.isFinite(Number(rawSessionId)) || Number(rawSessionId) <= 0) {
        setIdentityError("No active exam session found. Start the exam again from dashboard.")
        return
      }
      const sessionId = Number(rawSessionId)

      const parsed = JSON.parse(rawUser)
      const userId = Number(parsed.user_id ?? parsed.id)
      if (!Number.isFinite(userId) || userId <= 0) {
        setIdentityError("Unable to identify your account. Please sign in again.")
        return
      }

      const canvas = document.createElement("canvas")
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        setIdentityError("Could not prepare camera frame for verification.")
        return
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const lightingOk = evaluateLighting(canvas, ctx)
      if (!lightingOk) {
        setIdentityError(lightingHint || "Lighting quality is not sufficient for reliable verification.")
        return
      }
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.8)

      const aiBase = resolveAiBaseUrl()
      const response = await fetch(`${aiBase}/verify-identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          image_base64: imageBase64,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const serverMessage = typeof result?.error === "string" ? result.error : "Identity verification failed. Please retry."
        setIdentityError(serverMessage)
        return
      }

      if (result?.match !== true) {
        setIdentityError("Face does not match your registered profile. Try again with better lighting.")
        return
      }

      router.push("/exam")
    } catch {
      setIdentityError("Unable to reach AI verification service. Check network and try again.")
    } finally {
      setIsVerifyingIdentity(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-black text-white select-none dark:bg-black dark:text-white">
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
      </div>

      {/* ── Left step sidebar ── */}
      <aside className="hidden lg:flex flex-col justify-between w-72 xl:w-80 shrink-0 border-r border-white/5 px-8 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">Proctoai</p>
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
        <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">Proctoai</p>
      </div>

      <SystemStatusIndicators
        camera={cameraStatus}
        network={networkStatus}
        theme="dark"
        className="mb-6 w-full max-w-3xl justify-center"
      />

      {/* Center — face + ring */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8">

        {/* SVG face ring */}
        <div className="relative" style={{ width: 360, height: 360 }}>
          <svg width="360" height="360" viewBox="0 0 280 280" fill="none">
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
                width: 220,
                height: 280,
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
                  onLoadedData={() => setVideoFeedReady(true)}
                  onCanPlay={() => setVideoFeedReady(true)}
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
              {identityError ? (
                <p className="text-xs text-red-400">{identityError}</p>
              ) : null}
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
              ) : phaseError ? (
                <p className="text-xs text-amber-300">{phaseError}</p>
              ) : null}
              {telemetry ? (
                <p className="text-[11px] text-zinc-500">
                  yaw {telemetry.yaw.toFixed(1)} | pitch {telemetry.pitch.toFixed(1)} | {telemetry.anomalies.join(", ") || "no_anomalies"}
                </p>
              ) : null}
              <p className={`text-[11px] ${lightingStatus === "good" ? "text-emerald-300" : "text-amber-300"}`}>
                Lighting: {lightingStatus === "good" ? "Good" : lightingStatus === "high" ? "Too Bright" : lightingStatus === "low" ? "Too Dark" : "Low Contrast"}
              </p>
              {lightingHint ? <p className="text-[11px] text-amber-300">{lightingHint}</p> : null}
            </>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        {isDone ? (
          <Button
            onClick={() => void handleContinueToExam()}
            disabled={isVerifyingIdentity || !cameraReady}
            className="w-full h-14 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-colors"
          >
            {isVerifyingIdentity ? "Verifying..." : "Continue to Exam"}
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

      {(devtoolsLikelyOpen || securityAlert) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">Inspection Blocked</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {devtoolsLikelyOpen
                ? "Developer tools appear to be open. Close them before continuing verification."
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
