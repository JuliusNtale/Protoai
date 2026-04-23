"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle, User, Hash, Lock, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  { label: "Create your exam identity in one flow" },
  { label: "Capture a face profile for verification" },
  { label: "Move straight into the student dashboard" },
]

export default function RegisterPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", regNum: "", password: "" })

  function stopCameraStream() {
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  async function requestCameraStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "OverconstrainedError") {
        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      throw error
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.")
      return
    }

    setCameraError(null)

    if (streamRef.current) {
      const hasLiveTrack = streamRef.current.getVideoTracks().some(track => track.readyState === "live")
      if (!hasLiveTrack) {
        stopCameraStream()
      }
    }

    if (streamRef.current) {
      setCameraActive(true)
      return
    }

    try {
      const stream = await requestCameraStream()

      streamRef.current = stream
      setCameraError(null)
      setCameraActive(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraError("No camera permission available. Click Enable Camera again. If no prompt appears, allow camera access in browser site settings for this page.")
        return
      }

      if (error instanceof DOMException && error.name === "NotFoundError") {
        setCameraError("No camera device was found. Connect a webcam and try again.")
        return
      }

      if (error instanceof DOMException && error.name === "NotReadableError") {
        setCameraError("Camera is busy in another app. Close the other app and try again.")
        return
      }

      if (error instanceof DOMException && error.name === "SecurityError") {
        setCameraError("Camera access is blocked by browser security settings.")
        return
      }

      setCameraError("Unable to access camera. Check that no other app is using it, then try again.")
    }
  }

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return

    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play()
  }, [cameraActive])

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  async function handleCapture() {
    if (!streamRef.current) {
      await startCamera()
      if (!streamRef.current) return
    }

    if (!videoRef.current || !canvasRef.current) return

    setCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
      setCapturing(false)
      return
    }

    context.drawImage(video, 0, 0, width, height)
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92))
    setCaptured(true)
    setCapturing(false)
  }

  function handleRetake() {
    setCaptured(false)
    setCapturedImage(null)
    setCapturing(false)
    setCameraError(null)
    stopCameraStream()
    void startCamera()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push("/dashboard")
    }, 1500)
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
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
            <h1 className="text-2xl font-bold leading-tight text-white">
              AI Proctoring<br />System
            </h1>
            <p className="mt-2 text-xs text-blue-200/70 leading-relaxed">
              College of Information &amp; Virtual Education
            </p>
          </div>
        </div>

        <ul className="relative z-10 flex flex-col gap-5">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(99,130,220,0.25)", border: "1px solid rgba(99,130,220,0.4)" }}
              >
                <CheckCircle className="h-3 w-3 text-blue-300" />
              </span>
              <span className="text-sm text-blue-100/80 leading-snug">{feature.label}</span>
            </li>
          ))}
        </ul>

        <p className="relative z-10 text-[10px] text-blue-300/40 tracking-wide">
          &copy; 2025 University of Dodoma &middot; v1.0
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#f4f5f7] px-6 py-12">
        <div className="w-full max-w-275">
          <div className="mb-7">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign up</h2>
              <p className="mt-1 text-sm text-gray-500">Create your exam account and register your face in one step.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid items-stretch gap-6 lg:grid-cols-2">
            <div className="flex h-full flex-col gap-5 p-6">
              <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase" htmlFor="regnum">
                  Registration Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="regnum"
                    type="text"
                    value={form.regNum}
                    onChange={e => setForm(f => ({ ...f, regNum: e.target.value }))}
                    placeholder="T22-03-92323"
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Create a strong password"
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Minimum 8 characters with uppercase and numbers.</p>
              </div>
            </div>

            <div className="flex h-full flex-col gap-5 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Face Registration</h3>
              <p className="text-xs leading-relaxed text-gray-500">
                Position your face inside the frame and make sure the room is well lit. This profile is used for exam verification.
              </p>

              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-zinc-800 to-zinc-900">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)" }}
                  />

                  {captured && capturedImage ? (
                    <img src={capturedImage} alt="Captured face" className="absolute inset-0 h-full w-full object-cover" />
                  ) : cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}

                  {captured ? (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500 bg-zinc-700">
                        <CheckCircle className="h-10 w-10 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-400">Face Captured</p>
                    </>
                  ) : !cameraActive ? (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700">
                        <Camera className="h-10 w-10 text-zinc-400" />
                      </div>
                      <p className="text-xs font-medium text-zinc-300">Click Enable Camera to start</p>
                    </>
                  ) : (
                    <p className="text-xs font-medium text-yellow-400 animate-pulse">Ready to capture</p>
                  )}
                </div>

                {!captured && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-36 rounded-full border-2 border-dashed border-zinc-400/60" />
                  </div>
                )}

                <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-blue-500" />
                <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-blue-500" />
                <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-blue-500" />
                <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-blue-500" />

                <div className="absolute left-3 top-3 mt-7 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">Live</span>
                </div>
              </div>

              {captured && capturedImage && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Face captured successfully</p>
                    <p className="text-xs text-gray-500">Your biometric data has been saved.</p>
                  </div>
                </div>
              )}

              {cameraError ? (
                <p className="text-xs font-medium text-red-600">{cameraError}</p>
              ) : null}

              <div className="flex gap-3">
                {!captured ? (
                  <Button
                    type="button"
                    onClick={cameraActive ? handleCapture : startCamera}
                    disabled={capturing}
                    className="flex-1 bg-[#1a2d5a] text-white hover:bg-[#15254a]"
                  >
                    {capturing ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Capturing…
                      </span>
                    ) : !cameraActive ? (
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Enable Camera
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Capture Face
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handleRetake} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" /> Retake
                  </Button>
                )}

                {!captured && !cameraActive && cameraError ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="whitespace-nowrap"
                  >
                    Try Again
                  </Button>
                ) : null}
              </div>

              <ul className="flex flex-col gap-1 text-xs text-gray-500">
                <li className="flex items-center gap-1.5"><span className="text-blue-500">•</span> Ensure your face is well-lit</li>
                <li className="flex items-center gap-1.5"><span className="text-blue-500">•</span> Look directly at the camera</li>
                <li className="flex items-center gap-1.5"><span className="text-blue-500">•</span> Remove glasses if possible</li>
              </ul>
            </div>

            <div className="lg:col-span-2 flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/" className="font-semibold text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
              <Button
                type="submit"
                disabled={!captured || loading}
                className="min-w-45 bg-[#1a2d5a] text-white hover:bg-[#15254a] shadow-lg shadow-[#1a2d5a]/20"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Registering…
                  </span>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </div>
          </form>
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>
      </main>
    </div>
  )
}
