"use client"

import { Camera, ShieldCheck, Wifi } from "lucide-react"
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
    <div className={cn("flex min-w-[126px] items-center gap-2 rounded-xl border px-3 py-2", toneClasses(status.tone, theme))}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{title}</p>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold">{status.label}</span>
          <span
            className={cn(
              "h-2 w-2 flex-shrink-0 rounded-full",
              status.tone === "good" && "bg-emerald-400",
              status.tone === "warning" && "bg-amber-400",
              status.tone === "error" && "bg-red-400",
              status.tone === "neutral" && "bg-slate-400",
              status.pulse && "animate-pulse"
            )}
          />
        </div>
        <p className="truncate text-[11px] opacity-80">{status.detail}</p>
      </div>
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
      <StatusChip icon={<Camera className="h-4 w-4" />} title="Camera" status={camera} theme={theme} />
      <StatusChip icon={<Wifi className="h-4 w-4" />} title="Network" status={network} theme={theme} />
      <StatusChip icon={<ShieldCheck className="h-4 w-4" />} title="Condition" status={statusCondition} theme={theme} />
    </div>
  )
}
