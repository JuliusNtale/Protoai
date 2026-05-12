"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { getApiPath } from "@/lib/api-url"

type SidebarItem = {
  label: string
  href?: string
  icon?: ReactNode
  active?: boolean
}

type DashboardShellProps = {
  appName: string
  title: string
  subtitle?: string
  sidebarItems: SidebarItem[]
  rightTopSlot?: ReactNode
  isExiting?: boolean
  exitMessage?: string
  children: ReactNode
}

type SearchResultItem = {
  type: string
  id: number
  title: string
  subtitle: string
  href: string
}

export function DashboardShell({
  appName,
  title,
  subtitle,
  sidebarItems,
  rightTopSlot,
  isExiting = false,
  exitMessage = "Signing out...",
  children,
}: DashboardShellProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const trimmed = query.trim()
    if (!token || trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await fetch(`${getApiPath("/search")}?q=${encodeURIComponent(trimmed)}&limit=12`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          setResults([])
          return
        }
        setResults(payload.results || [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 220)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  function onSelect(result: SearchResultItem) {
    setOpen(false)
    setQuery("")
    router.push(result.href)
  }

  return (
    <main className="relative min-h-screen bg-background p-4 text-foreground md:p-6">
      {isExiting ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-xl">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">{exitMessage}</p>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_55px_rgba(0,0,0,0.45)] md:min-h-[calc(100vh-3rem)]">
        <aside className="hidden w-72 border-r border-border bg-muted/35 px-4 py-5 lg:block">
          <div className="px-2">
            <h2 className="text-lg font-semibold text-foreground">{appName}</h2>
          </div>
          <nav className="mt-7 space-y-3 px-1">
            {sidebarItems.map((item, index) => {
              const body = (
                <div
                  className={`mx-1 flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition ${
                    item.active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
              return item.href ? (
                <Link key={`${item.label}-${index}`} href={item.href}>
                  {body}
                </Link>
              ) : (
                <div key={`${item.label}-${index}`}>{body}</div>
              )
            })}
          </nav>
        </aside>

        <div className="flex min-h-full min-w-0 flex-1 flex-col">
          <header className="border-b border-border px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <div ref={searchContainerRef} className="relative hidden md:block">
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    <Search className="h-4 w-4" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onFocus={() => setOpen(results.length > 0)}
                      placeholder="Search exams, users, sessions..."
                      className="w-64 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                  {open ? (
                    <div className="absolute right-0 z-30 mt-2 w-[30rem] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      {searching ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                      ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                      ) : (
                        <ul className="max-h-80 overflow-y-auto">
                          {results.map((result) => (
                            <li key={`${result.type}-${result.id}`}>
                              <button
                                onClick={() => onSelect(result)}
                                className="w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent last:border-b-0"
                              >
                                <p className="text-sm font-medium text-foreground">{result.title}</p>
                                <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
                <ThemeToggle />
                {rightTopSlot}
              </div>
            </div>
          </header>
          <section className="flex-1 space-y-5 px-4 py-5 md:px-6">{children}</section>
        </div>
      </div>
    </main>
  )
}

export function DashboardPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
