"use client"

import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  value: string
  className?: string
}

function toneFor(value: string) {
  const normalized = value.toLowerCase()
  if (["completed", "live", "active", "low"].includes(normalized)) {
    return {
      dot: "bg-emerald-500",
      className: "border-emerald-200/80 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300",
    }
  }
  if (["scheduled", "medium", "pending"].includes(normalized)) {
    return {
      dot: "bg-amber-500",
      className: "border-amber-200/80 bg-amber-50/60 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300",
    }
  }
  if (["high", "locked", "inactive", "blocked"].includes(normalized)) {
    return {
      dot: "bg-red-500",
      className: "border-red-200/80 bg-red-50/60 text-red-800 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300",
    }
  }
  return {
    dot: "bg-slate-400",
    className: "border-slate-200/80 bg-slate-50/60 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  }
}

export function StatusBadge({ value, className }: StatusBadgeProps) {
  const tone = toneFor(value)

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize leading-5",
        tone.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {value || "unknown"}
    </span>
  )
}
