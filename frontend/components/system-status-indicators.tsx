"use client"

import { Camera, ShieldCheck, Wifi } from "lucide-react"

const S = "h-3 w-3"
import { cn } from "@/lib/utils"
import type { IndicatorStatus } from "@/hooks/use-network-status"

type Props = {
  camera: IndicatorStatus
  network: IndicatorStatus
  condition?: IndicatorStatus
  className?: string
  theme?: "light" | "dark"
}

function toneClasses(tone: IndicatorStatus["tone"], theme: "light" | "dark") {
  const palette = {
    light: {
      good: "border-emerald-200 bg-emerald-50 text-emerald-700",
      warning: "border-amber-200 bg-amber-50 text-amber-700",
      error: "border-red-200 bg-red-50 text-red-700",
      neutral: "border-slate-200 bg-slate-50 text-slate-700",
    },
    dark: {
      good: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
      warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
      error: "border-red-400/30 bg-red-500/10 text-red-300",
      neutral: "border-white/10 bg-white/5 text-zinc-300",
    },
  }

  return palette[theme][tone]
}

function deriveCondition(camera: IndicatorStatus, network: IndicatorStatus): IndicatorStatus {
  const tones = [camera.tone, network.tone]
  if (tones.includes("error")) {
    return {
      label: "Attention",
      detail: "Fix the failing device before continuing",
      tone: "error",
    }
  }

  if (tones.includes("warning")) {
    return {
      label: "Monitor",
      detail: "System is usable but not ideal",
      tone: "warning",
    }
  }

  if (tones.includes("good")) {
    return {
      label: "Ready",
      detail: "Devices are healthy",
      tone: "good",
      pulse: true,
    }
  }

  return {
    label: "Checking",
    detail: "Waiting for device checks",
    tone: "neutral",
  }
}

function StatusChip({
  icon,
  title,
  status,
  theme,
}: {
  icon: React.ReactNode
  title: string
  status: IndicatorStatus
  theme: "light" | "dark"
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses(status.tone, theme),
      )}
      title={`${title}: ${status.detail}`}
    >
      <span className="flex-shrink-0 opacity-80">{icon}</span>
      <span className="font-semibold">{status.label}</span>
      {status.detail && (
        <span className="hidden sm:inline opacity-60 text-[11px]">&mdash; {status.detail}</span>
      )}
      <span
        className={cn(
          "h-1.5 w-1.5 flex-shrink-0 rounded-full",
          status.tone === "good"    && "bg-emerald-400",
          status.tone === "warning" && "bg-amber-400",
          status.tone === "error"   && "bg-red-400",
          status.tone === "neutral" && "bg-slate-400",
          status.pulse && "animate-pulse",
        )}
      />
    </div>
  )
}

export function SystemStatusIndicators({
  camera,
  network,
  condition,
  className,
  theme = "light",
}: Props) {
  const statusCondition = condition ?? deriveCondition(camera, network)

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <StatusChip icon={<Camera className={S} />} title="Camera" status={camera} theme={theme} />
      <StatusChip icon={<Wifi className={S} />} title="Network" status={network} theme={theme} />
      <StatusChip icon={<ShieldCheck className={S} />} title="Condition" status={statusCondition} theme={theme} />
    </div>
  )
}
