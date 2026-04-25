"use client"

import { useEffect, useRef, useState } from "react"
import type { IndicatorStatus } from "@/hooks/use-network-status"

type UseCameraStatusOptions = {
  secureOriginMessage?: string
}

const DEFAULT_SECURE_ORIGIN_MESSAGE = "Camera needs HTTPS or localhost to work."

export function useCameraStatus(options: UseCameraStatusOptions = {}) {
  const [camera, setCamera] = useState<IndicatorStatus>({
    label: "Checking",
    detail: "Preparing camera access",
    tone: "neutral",
  })
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false

    const stopStream = () => {
      if (!streamRef.current) return
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    const startCamera = async () => {
      if (!window.isSecureContext) {
        setCamera({
          label: "Blocked",
          detail: options.secureOriginMessage ?? DEFAULT_SECURE_ORIGIN_MESSAGE,
          tone: "error",
        })
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera({
          label: "Unsupported",
          detail: "Browser cannot access a webcam",
          tone: "error",
        })
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream
        setCamera({
          label: "Ready",
          detail: "Camera is connected",
          tone: "good",
          pulse: true,
        })
      } catch (error) {
        if (!(error instanceof DOMException)) {
          setCamera({
            label: "Unavailable",
            detail: "Camera could not be started",
            tone: "error",
          })
          return
        }

        if (error.name === "NotAllowedError") {
          setCamera({
            label: "Denied",
            detail: "Allow camera permission",
            tone: "error",
          })
          return
        }

        if (error.name === "NotFoundError") {
          setCamera({
            label: "Missing",
            detail: "No camera device detected",
            tone: "error",
          })
          return
        }

        if (error.name === "NotReadableError") {
          setCamera({
            label: "Busy",
            detail: "Camera is used by another app",
            tone: "warning",
          })
          return
        }

        setCamera({
          label: "Unavailable",
          detail: "Camera access failed",
          tone: "error",
        })
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [options.secureOriginMessage])

  return camera
}
