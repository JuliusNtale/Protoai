"use client"

import { useEffect, useState } from "react"

export type IndicatorTone = "good" | "warning" | "error" | "neutral"

export type IndicatorStatus = {
  label: string
  detail: string
  tone: IndicatorTone
  pulse?: boolean
}

type BrowserConnection = {
  effectiveType?: string
  downlink?: number
  saveData?: boolean
  addEventListener?: (type: "change", listener: () => void) => void
  removeEventListener?: (type: "change", listener: () => void) => void
}

function buildNetworkStatus(): IndicatorStatus {
  if (typeof navigator === "undefined") {
    return {
      label: "Network",
      detail: "Checking connection",
      tone: "neutral",
    }
  }

  if (!navigator.onLine) {
    return {
      label: "Offline",
      detail: "No internet connection",
      tone: "error",
    }
  }

  const connection = (navigator as Navigator & { connection?: BrowserConnection }).connection
  const effectiveType = connection?.effectiveType
  const downlink = connection?.downlink

  if (connection?.saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
    return {
      label: "Weak",
      detail: "Connection is unstable",
      tone: "warning",
      pulse: true,
    }
  }

  if (effectiveType === "3g") {
    return {
      label: "Fair",
      detail: "Connection may fluctuate",
      tone: "warning",
    }
  }

  if (typeof downlink === "number" && downlink < 1.5) {
    return {
      label: "Slow",
      detail: "Bandwidth is limited",
      tone: "warning",
    }
  }

  return {
    label: "Stable",
    detail: effectiveType ? `${effectiveType.toUpperCase()} connection` : "Connection is healthy",
    tone: "good",
    pulse: true,
  }
}

export function useNetworkStatus() {
  const [network, setNetwork] = useState<IndicatorStatus>(() => buildNetworkStatus())

  useEffect(() => {
    const updateStatus = () => setNetwork(buildNetworkStatus())
    const connection = (navigator as Navigator & { connection?: BrowserConnection }).connection

    updateStatus()
    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)
    connection?.addEventListener?.("change", updateStatus)

    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
      connection?.removeEventListener?.("change", updateStatus)
    }
  }, [])

  return network
}
