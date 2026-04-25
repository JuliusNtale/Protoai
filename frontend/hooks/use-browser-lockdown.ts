"use client"

import { useEffect, useState } from "react"

type UseBrowserLockdownOptions = {
  enabled?: boolean
  onBlockedAction?: (message: string) => void
}

const DEVTOOLS_THRESHOLD = 160

function isBlockedShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const ctrlOrMeta = event.ctrlKey || event.metaKey

  if (event.key === "F12") return true
  if (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key)) return true
  if (ctrlOrMeta && ["u"].includes(key)) return true

  return false
}

function detectDevtoolsOpen() {
  if (typeof window === "undefined") return false

  const widthGap = window.outerWidth - window.innerWidth
  const heightGap = window.outerHeight - window.innerHeight

  return widthGap > DEVTOOLS_THRESHOLD || heightGap > DEVTOOLS_THRESHOLD
}

export function useBrowserLockdown(options: UseBrowserLockdownOptions = {}) {
  const { enabled = true, onBlockedAction } = options
  const [devtoolsLikelyOpen, setDevtoolsLikelyOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      onBlockedAction?.("Right-click is disabled during verification and the exam.")
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isBlockedShortcut(event)) return
      event.preventDefault()
      event.stopPropagation()
      onBlockedAction?.("Browser inspection shortcuts are disabled during verification and the exam.")
    }

    let lastDevtoolsState = detectDevtoolsOpen()
    setDevtoolsLikelyOpen(lastDevtoolsState)

    const interval = window.setInterval(() => {
      const nextState = detectDevtoolsOpen()
      if (nextState !== lastDevtoolsState) {
        lastDevtoolsState = nextState
        setDevtoolsLikelyOpen(nextState)
        if (nextState) {
          onBlockedAction?.("Developer tools detected. Close them to continue.")
        }
      }
    }, 1000)

    window.addEventListener("contextmenu", handleContextMenu)
    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [enabled, onBlockedAction])

  return { devtoolsLikelyOpen }
}
