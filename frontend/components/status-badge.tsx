"use client"

import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  value: string
  className?: string
}

function toneFor(value: string) {
  const normalized = value.toLowerCase()
  if (["completed", "live", "active", "low"].includes(normalized)) {
    return "text-emerald-600 dark:text-emerald-400"
  }
  if (["scheduled", "medium", "pending"].includes(normalized)) {
    return "text-amber-600 dark:text-amber-400"
  }
  if (["high", "locked", "inactive", "blocked"].includes(normalized)) {
    return "text-red-600 dark:text-red-400"
  }
  return "text-slate-600 dark:text-slate-400"
}

export function StatusBadge({ value, className }: StatusBadgeProps) {
  return (
    <span className={cn("text-sm font-medium capitalize", toneFor(value), className)}>
      {value || "unknown"}
    </span>
  )
}
