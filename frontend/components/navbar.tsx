"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, ShieldCheck, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavbarProps {
  role?: "student" | "lecturer" | "admin" | "guest"
  userName?: string
}

const navLinks: Record<string, { href: string; label: string }[]> = {
  student: [
    { href: "/verify", label: "Verify Identity" },
    { href: "/exam", label: "My Exam" },
  ],
  lecturer: [
    { href: "/lecturer", label: "Dashboard" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
  ],
  guest: [],
}

export function Navbar({ role = "guest", userName }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const links = navLinks[role] ?? []

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg tracking-tight">ProctorAI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              Hi, <span className="font-medium text-foreground">{userName}</span>
            </span>
          )}

          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {role !== "guest" && (
            <Link href="/">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">Sign Out</Button>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("md:hidden overflow-hidden transition-all duration-300", menuOpen ? "max-h-64 border-t border-border" : "max-h-0")}>
        <nav className="flex flex-col gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {role !== "guest" && (
            <Link href="/" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => setMenuOpen(false)}>
              Sign Out
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
