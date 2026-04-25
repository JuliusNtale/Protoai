"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, GripHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CalculatorProps {
  allowed?: boolean
}

// ─── Key definitions (Casio fx-991 layout, 5 cols) ─────────────────────────────
type KeyColor = "orange" | "blue" | "dark" | "mid" | "num" | "eq"

interface CalcKey {
  label: string
  top?: string       // small label above key (2nd function)
  color: KeyColor
  action: string     // internal action id
  span?: number      // col-span
}

const ROWS: CalcKey[][] = [
  // Row 1 — mode / setup
  [
    { label: "SHIFT",  color: "orange", action: "shift",    top: "" },
    { label: "ALPHA",  color: "blue",   action: "alpha",    top: "" },
    { label: "MODE",   color: "dark",   action: "mode",     top: "SETUP" },
    { label: "ON",     color: "dark",   action: "on",       top: "" },
  ],
  // Row 2 — fractions / trig
  [
    { label: "x⁻¹",   color: "dark",   action: "inv",      top: "1/x" },
    { label: "sin",    color: "dark",   action: "sin",      top: "sin⁻¹" },
    { label: "cos",    color: "dark",   action: "cos",      top: "cos⁻¹" },
    { label: "tan",    color: "dark",   action: "tan",      top: "tan⁻¹" },
    { label: "xⁿ",    color: "dark",   action: "pow",      top: "x^" },
  ],
  // Row 3 — log / powers
  [
    { label: "log",    color: "dark",   action: "log10",    top: "10x" },
    { label: "ln",     color: "dark",   action: "ln",       top: "ex" },
    { label: "√x",    color: "dark",   action: "sqrt",     top: "x²" },
    { label: "(",      color: "mid",    action: "oparen"  },
    { label: ")",      color: "mid",    action: "cparen"  },
  ],
  // Row 4 — fractions / constants
  [
    { label: "S⟺D",  color: "dark",   action: "stod",     top: "a b/c" },
    { label: "%",      color: "mid",    action: "percent",  top: "% " },
    { label: "π",      color: "mid",    action: "pi",       top: "e" },
    { label: "EXP",    color: "mid",    action: "exp",      top: "" },
    { label: "Ans",    color: "mid",    action: "ans",      top: "" },
  ],
  // Row 5 — 7 8 9 DEL AC
  [
    { label: "7",      color: "num",    action: "7" },
    { label: "8",      color: "num",    action: "8" },
    { label: "9",      color: "num",    action: "9" },
    { label: "DEL",    color: "orange", action: "del",      top: "INS" },
    { label: "AC",     color: "orange", action: "ac",       top: "" },
  ],
  // Row 6 — 4 5 6 × ÷
  [
    { label: "4",      color: "num",    action: "4" },
    { label: "5",      color: "num",    action: "5" },
    { label: "6",      color: "num",    action: "6" },
    { label: "×",      color: "mid",    action: "*" },
    { label: "÷",      color: "mid",    action: "/" },
  ],
  // Row 7 — 1 2 3 + −
  [
    { label: "1",      color: "num",    action: "1" },
    { label: "2",      color: "num",    action: "2" },
    { label: "3",      color: "num",    action: "3" },
    { label: "+",      color: "mid",    action: "+" },
    { label: "−",      color: "mid",    action: "-" },
  ],
  // Row 8 — 0 . ×10ⁿ Ans =
  [
    { label: "0",      color: "num",    action: "0",        span: 2 },
    { label: ".",      color: "num",    action: "." },
    { label: "×10ⁿ",  color: "mid",    action: "e10" },
    { label: "=",      color: "eq",     action: "=" },
  ],
]

// ─── Colors ─────────────────────────────────────────────────────────────────────
const KEY_STYLE: Record<KeyColor, string> = {
  orange: "bg-[#e07a00] hover:bg-[#c96e00] active:bg-[#b56200] text-white",
  blue:   "bg-[#0059a8] hover:bg-[#004a8f] active:bg-[#003d78] text-white",
  dark:   "bg-[#2a2d34] hover:bg-[#3a3e48] active:bg-[#1e2128] text-white",
  mid:    "bg-[#3d4450] hover:bg-[#4a5262] active:bg-[#30353f] text-white",
  num:    "bg-[#4a4f5c] hover:bg-[#575e6e] active:bg-[#3c414d] text-white",
  eq:     "bg-[#e07a00] hover:bg-[#c96e00] active:bg-[#b56200] text-white font-bold",
}

// ─── Calculator logic ─────────────────────────────────────────────────────────
function evaluate(expr: string): string {
  try {
    let e = expr
      .replace(/π/g, String(Math.PI))
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/sin⁻¹\(/g, "Math.asin(")
      .replace(/cos⁻¹\(/g, "Math.acos(")
      .replace(/tan⁻¹\(/g, "Math.atan(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/log\(/g, "Math.log10(")
      .replace(/√\(/g, "Math.sqrt(")
      .replace(/\^/g, "**")
      .replace(/E/g, "e")

    // Balance open parens
    const open  = (e.match(/\(/g) || []).length
    const close = (e.match(/\)/g) || []).length
    for (let i = 0; i < open - close; i++) e += ")"

    // eslint-disable-next-line no-new-func
    const result = new Function("return " + e)() as number
    if (!isFinite(result)) return "Math ERROR"
    return Number.isInteger(result)
      ? String(result)
      : parseFloat(result.toFixed(10)).toString()
  } catch {
    return "Syntax ERROR"
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Calculator({ allowed = true }: CalculatorProps) {
  const [open, setOpen]             = useState(false)
  const [expr, setExpr]             = useState("")
  const [result, setResult]         = useState("0")
  const [ans, setAns]               = useState("0")
  const [shift, setShift]           = useState(false)
  const [justEvaled, setJustEvaled] = useState(false)

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [pos, setPos]       = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragOrigin  = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef    = useRef<HTMLDivElement>(null)

  // Initialise position to top-right when first opened
  const [initialised, setInitialised] = useState(false)
  useEffect(() => {
    if (open && !initialised && typeof window !== "undefined") {
      setPos({ x: window.innerWidth - 316, y: 64 })
      setInitialised(true)
    }
  }, [open, initialised])

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = "touches" in e ? e.touches[0] : e
    dragOrigin.current = { mx: point.clientX, my: point.clientY, px: pos.x, py: pos.y }
    setDragging(true)
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent | TouchEvent) {
      const point = "touches" in e ? (e as TouchEvent).touches[0] : e as MouseEvent
      const dx = point.clientX - dragOrigin.current.mx
      const dy = point.clientY - dragOrigin.current.my
      const newX = Math.max(0, Math.min(window.innerWidth  - 296, dragOrigin.current.px + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragOrigin.current.py + dy))
      setPos({ x: newX, y: newY })
    }
    function onUp() { setDragging(false) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("touchend",  onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend",  onUp)
    }
  }, [dragging])

  const press = useCallback((action: string) => {
    const digits = "0123456789"
    const ops    = ["+", "-", "*", "/"]

    if (action === "shift") { setShift(s => !s); return }
    if (action === "alpha") return
    if (action === "mode")  return
    if (action === "on" || action === "ac") {
      setExpr(""); setResult("0"); setShift(false); setJustEvaled(false); return
    }
    if (action === "del") {
      setExpr(e => e.slice(0, -1) || ""); setResult(prev => prev); return
    }

    setShift(false)

    let insert = ""

    if (digits.includes(action) || action === ".") {
      if (justEvaled) { setExpr(""); setJustEvaled(false) }
      insert = action
    } else if (ops.includes(action)) {
      if (justEvaled) setJustEvaled(false)
      insert = action
    } else if (action === "oparen") insert = "("
    else if (action === "cparen")  insert = ")"
    else if (action === "sin")     insert = shift ? "sin⁻¹(" : "sin("
    else if (action === "cos")     insert = shift ? "cos⁻¹(" : "cos("
    else if (action === "tan")     insert = shift ? "tan⁻¹(" : "tan("
    else if (action === "log10")   insert = shift ? "10^(" : "log("
    else if (action === "ln")      insert = shift ? "e^(" : "ln("
    else if (action === "sqrt")    insert = shift ? "(" : "√("
    else if (action === "pow")     insert = "^("
    else if (action === "inv")     insert = "1/("
    else if (action === "pi")      insert = shift ? "e" : "π"
    else if (action === "percent") insert = "/100"
    else if (action === "exp")     insert = "×10^("
    else if (action === "e10")     insert = "×10^("
    else if (action === "ans")     { insert = ans; if (justEvaled) { setExpr(""); setJustEvaled(false) } }
    else if (action === "stod")    return
    else if (action === "=") {
      const res = evaluate(expr || "0")
      setResult(res)
      if (!res.includes("ERROR")) setAns(res)
      setJustEvaled(true)
      return
    }

    setExpr(e => e + insert)
    // live preview
    const preview = evaluate((expr + insert) || "0")
    if (!preview.includes("ERROR") && !preview.includes("Syntax")) setResult(preview)
  }, [expr, ans, shift, justEvaled])

  // Keyboard support when open
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      const map: Record<string, string> = {
        "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9",
        ".":".", "+":"+", "-":"-", "*":"*", "/":"/",
        "(":"oparen", ")":"cparen",
        "Enter":"=", "=":"=",
        "Backspace":"del", "Escape":"ac",
      }
      if (map[e.key]) { e.preventDefault(); press(map[e.key]) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, press])

  if (!allowed) return null

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md border border-[#e07a00]/40 bg-[#e07a00]/15 px-2.5 py-1 text-[11px] font-semibold text-[#e07a00] transition-colors hover:bg-[#e07a00]/25"
        aria-label="Open scientific calculator"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="4" width="12" height="4" rx="1" fill="currentColor" opacity=".4" />
          <circle cx="6" cy="12" r="1" fill="currentColor" />
          <circle cx="10" cy="12" r="1" fill="currentColor" />
          <circle cx="14" cy="12" r="1" fill="currentColor" />
          <circle cx="6" cy="16" r="1" fill="currentColor" />
          <circle cx="10" cy="16" r="1" fill="currentColor" />
          <circle cx="14" cy="16" r="1" fill="currentColor" />
        </svg>
        CALC
      </button>

      {/* Calculator panel — fixed, draggable */}
      {open && (
        <div
          ref={panelRef}
          className="z-[9999] select-none"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            fontFamily: "'Courier New', monospace",
            touchAction: "none",
          }}
        >
          {/* Body */}
          <div
            className="rounded-2xl border border-[#1a1c22] shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
            style={{ background: "#1d1f26", width: 296 }}
          >
            {/* Brand strip / drag handle */}
            <div
              className={cn(
                "flex items-center justify-between px-3 pt-3 pb-1 rounded-t-2xl",
                "cursor-grab active:cursor-grabbing",
              )}
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal className="h-3.5 w-3.5 text-[#4a5060]" />
                <div>
                  <span className="block text-[9px] font-bold tracking-widest text-[#a0a8b8]">CASIO</span>
                  <span className="block text-[8px] tracking-wider text-[#6a7080]">fx-991 EX  CLASSWIZ</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                onMouseDown={e => e.stopPropagation()}
                className="rounded-full p-1 text-[#6a7080] hover:text-[#a0a8b8] transition-colors"
                aria-label="Close calculator"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Display */}
            <div
              className="mx-3 mb-3 rounded-lg border border-[#2a9d6a]/30 px-3 pt-2 pb-2.5"
              style={{ background: "#b8ccb4", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {/* Expression / equation line */}
              <p className="h-5 overflow-hidden text-right text-[11px] text-[#2a3a2a] opacity-80 leading-tight truncate">
                {expr || "\u00a0"}
              </p>
              {/* Main result */}
              <p className={cn(
                "text-right font-mono font-bold leading-none tracking-tight text-[#111c11] transition-all",
                result.length > 12 ? "text-lg" : "text-2xl"
              )}>
                {result}
              </p>
              {/* Shift / mode indicators */}
              <div className="mt-1 flex items-center gap-2">
                {shift && (
                  <span className="rounded bg-[#e07a00]/80 px-1 text-[8px] font-bold text-white">S</span>
                )}
                <span className="text-[8px] text-[#3a5a3a] opacity-60 ml-auto">D</span>
              </div>
            </div>

            {/* Keys */}
            <div className="flex flex-col gap-1.5 px-3 pb-4">
              {ROWS.map((row, ri) => (
                <div key={ri} className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                  {row.map((key) => (
                    <button
                      key={key.action}
                      onClick={() => press(key.action)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-md py-2 text-center transition-all active:scale-95",
                        KEY_STYLE[key.color],
                        key.span === 2 && "col-span-2",
                      )}
                      style={{ minHeight: 36 }}
                    >
                      {/* Shift label above */}
                      {key.top !== undefined && (
                        <span className="absolute -top-3 left-0 right-0 text-center text-[7px] font-semibold text-[#e07a00] leading-none pointer-events-none">
                          {key.top}
                        </span>
                      )}
                      <span className="text-[12px] font-semibold leading-none">{key.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Solar panel strip */}
            <div
              className="mx-3 mb-3 h-3 rounded-sm opacity-60"
              style={{ background: "linear-gradient(90deg, #1a3a1a 0%, #2a5a2a 40%, #1a3a1a 100%)" }}
            />
          </div>
        </div>
      )}
    </>
  )
}
