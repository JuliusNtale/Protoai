"use client"

import { Camera, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface WebcamPreviewProps {
  variant?: "large" | "small"
  showFrame?: boolean
  frameColor?: "green" | "yellow" | "red"
  label?: string
  className?: string
}

export function WebcamPreview({
  variant = "large",
  showFrame = false,
  frameColor = "green",
  label,
  className,
}: WebcamPreviewProps) {
  const frameColors = {
    green: "border-[color:var(--success)] shadow-[0_0_16px_var(--success)]",
    yellow: "border-[color:var(--warning)] shadow-[0_0_16px_var(--warning)]",
    red: "border-destructive shadow-[0_0_16px_theme(colors.red.500)]",
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-zinc-900", className)}>
      {/* Simulated video feed */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {/* Fake scan lines */}
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)" }} />

        {/* Pulsing user silhouette */}
        <div className={cn("flex items-center justify-center rounded-full bg-zinc-700", variant === "large" ? "h-24 w-24" : "h-10 w-10")}>
          <User className={cn("text-zinc-400", variant === "large" ? "h-12 w-12" : "h-5 w-5")} />
        </div>

        {variant === "large" && (
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Live Camera</span>
          </div>
        )}
      </div>

      {/* Face detection frame overlay */}
      {showFrame && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn("border-2 rounded-lg", frameColors[frameColor], variant === "large" ? "h-48 w-40" : "h-16 w-12")} />
        </div>
      )}

      {/* Corner brackets */}
      {showFrame && variant === "large" && (
        <>
          <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-green-400" />
          <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-green-400" />
          <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-green-400" />
          <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-green-400" />
        </>
      )}

      {/* Camera icon badge (small variant) */}
      {variant === "small" && (
        <div className="absolute bottom-1 right-1 rounded bg-black/60 p-0.5">
          <Camera className="h-3 w-3 text-zinc-300" />
        </div>
      )}

      {/* Label */}
      {label && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-zinc-200">{label}</span>
        </div>
      )}
    </div>
  )
}
