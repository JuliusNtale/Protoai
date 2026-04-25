"use client"

import * as React from "react"
import { useState } from "react"
import { Calculator as CalculatorIcon, X, Delete } from "lucide-react"

export function Calculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [display, setDisplay] = useState("0")
  const [equation, setEquation] = useState("")

  const handleInput = (val: string) => {
    if (display === "0" && val !== ".") {
      setDisplay(val)
    } else {
      setDisplay(display + val)
    }
  }

  const handleOperator = (op: string) => {
    setEquation(equation + display + op)
    setDisplay("0")
  }

  const handleFunction = (fn: string) => {
    // Add function wrapper to display
    if (display === "0") {
      setDisplay(fn + "(")
    } else {
      setDisplay(display + fn + "(")
    }
  }

  const handleConstant = (c: string) => {
    if (display === "0") {
      setDisplay(c)
    } else {
      setDisplay(display + c)
    }
  }

  const handleEqual = () => {
    try {
      let finalEq = equation + display
      
      // Replace symbols with JavaScript Math equivalents for evaluation
      let evalEq = finalEq
        .replace(/π/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/\^/g, "**")

      // Balance parentheses roughly
      const openParens = (evalEq.match(/\(/g) || []).length
      const closeParens = (evalEq.match(/\)/g) || []).length
      for (let i = 0; i < openParens - closeParens; i++) {
        evalEq += ")"
      }

      // We use Function because we strictly control the inputs through the UI
      const result = new Function("return " + evalEq)()
      
      // Format result to avoid deep decimals like 0.1+0.2=0.30000000000000004
      const formattedResult = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(10)).toString()
      
      setDisplay(formattedResult)
      setEquation("")
    } catch (e) {
      setDisplay("Error")
      setEquation("")
    }
  }

  const handleClear = () => {
    setDisplay("0")
    setEquation("")
  }

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay("0")
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md border border-blue-400/40 bg-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-500/30 sm:flex"
      >
        <CalculatorIcon className="h-3.5 w-3.5" />
        Scientific Calculator
      </button>

      {isOpen && (
        <div className="absolute top-16 right-4 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <CalculatorIcon className="w-4 h-4 text-blue-500" />
              Scientific Calculator
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-secondary rounded-full p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-muted p-3 rounded-lg mb-4 text-right shadow-inner border border-border/50">
            <div className="text-xs text-muted-foreground h-5 font-mono overflow-hidden text-ellipsis whitespace-nowrap">{equation}</div>
            <div className="text-3xl font-mono text-foreground overflow-hidden text-ellipsis whitespace-nowrap tracking-tight">{display}</div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {/* Row 1 */}
            <CalcButton onClick={() => handleFunction('sin')} className="bg-secondary/50 text-secondary-foreground text-xs">sin</CalcButton>
            <CalcButton onClick={() => handleFunction('cos')} className="bg-secondary/50 text-secondary-foreground text-xs">cos</CalcButton>
            <CalcButton onClick={() => handleFunction('tan')} className="bg-secondary/50 text-secondary-foreground text-xs">tan</CalcButton>
            <CalcButton onClick={handleClear} className="bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">C</CalcButton>
            <CalcButton onClick={handleDelete} className="bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">DEL</CalcButton>

            {/* Row 2 */}
            <CalcButton onClick={() => handleFunction('ln')} className="bg-secondary/50 text-secondary-foreground text-xs">ln</CalcButton>
            <CalcButton onClick={() => handleFunction('log')} className="bg-secondary/50 text-secondary-foreground text-xs">log</CalcButton>
            <CalcButton onClick={() => handleConstant('π')} className="bg-secondary/50 text-secondary-foreground text-xs">π</CalcButton>
            <CalcButton onClick={() => handleConstant('e')} className="bg-secondary/50 text-secondary-foreground text-xs">e</CalcButton>
            <CalcButton onClick={() => handleInput('^')} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">^</CalcButton>

            {/* Row 3 */}
            <CalcButton onClick={() => handleFunction('sqrt')} className="bg-secondary/50 text-secondary-foreground text-xs">√</CalcButton>
            <CalcButton onClick={() => handleInput('(')} className="bg-secondary/50 text-secondary-foreground text-xs">(</CalcButton>
            <CalcButton onClick={() => handleInput(')')} className="bg-secondary/50 text-secondary-foreground text-xs">)</CalcButton>
            <CalcButton onClick={() => handleOperator('/')} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">÷</CalcButton>
            <CalcButton onClick={() => handleOperator('*')} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">×</CalcButton>

            {/* Row 4 */}
            <CalcButton onClick={() => handleInput('7')} className="bg-background text-foreground font-medium border border-border shadow-sm">7</CalcButton>
            <CalcButton onClick={() => handleInput('8')} className="bg-background text-foreground font-medium border border-border shadow-sm">8</CalcButton>
            <CalcButton onClick={() => handleInput('9')} className="bg-background text-foreground font-medium border border-border shadow-sm">9</CalcButton>
            <CalcButton onClick={() => handleOperator('-')} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20 col-span-2">-</CalcButton>

            {/* Row 5 */}
            <CalcButton onClick={() => handleInput('4')} className="bg-background text-foreground font-medium border border-border shadow-sm">4</CalcButton>
            <CalcButton onClick={() => handleInput('5')} className="bg-background text-foreground font-medium border border-border shadow-sm">5</CalcButton>
            <CalcButton onClick={() => handleInput('6')} className="bg-background text-foreground font-medium border border-border shadow-sm">6</CalcButton>
            <CalcButton onClick={() => handleOperator('+')} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20 col-span-2">+</CalcButton>

            {/* Row 6 */}
            <CalcButton onClick={() => handleInput('1')} className="bg-background text-foreground font-medium border border-border shadow-sm">1</CalcButton>
            <CalcButton onClick={() => handleInput('2')} className="bg-background text-foreground font-medium border border-border shadow-sm">2</CalcButton>
            <CalcButton onClick={() => handleInput('3')} className="bg-background text-foreground font-medium border border-border shadow-sm">3</CalcButton>
            <CalcButton onClick={() => handleInput('.')} className="bg-background text-foreground font-medium border border-border shadow-sm">.</CalcButton>
            <CalcButton onClick={handleEqual} className="bg-blue-600 text-white hover:bg-blue-700 shadow-md font-bold">=</CalcButton>
            
            {/* Row 7 */}
            <CalcButton onClick={() => handleInput('0')} className="bg-background text-foreground font-medium border border-border shadow-sm col-span-5">0</CalcButton>
          </div>
        </div>
      )}
    </>
  )
}

function CalcButton({ children, onClick, className = "" }: { children: React.ReactNode, onClick: () => void, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg transition-all active:scale-95 flex items-center justify-center font-mono ${className}`}
    >
      {children}
    </button>
  )
}
