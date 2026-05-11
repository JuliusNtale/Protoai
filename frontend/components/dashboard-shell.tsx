"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import type { ReactNode } from "react"

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
  children: ReactNode
}

export function DashboardShell({
  appName,
  title,
  subtitle,
  sidebarItems,
  rightTopSlot,
  children,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-[#eef2f7] p-4 text-slate-900 md:p-6">
      <div className="mx-auto flex w-full max-w-[1400px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <aside className="hidden w-72 border-r border-slate-200 bg-[#f6f8fb] px-4 py-5 lg:block">
          <div className="px-2">
            <h2 className="text-lg font-semibold text-slate-900">{appName}</h2>
          </div>
          <nav className="mt-6 space-y-1">
            {sidebarItems.map((item, index) => {
              const body = (
                <div
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    item.active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <span className="text-slate-500">{item.icon}</span>
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

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-500 md:flex">
                  <Search className="h-4 w-4" />
                  <input
                    readOnly
                    placeholder="Search"
                    className="w-44 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
                {rightTopSlot}
              </div>
            </div>
          </header>
          <section className="space-y-5 px-4 py-5 md:px-6">{children}</section>
        </div>
      </div>
    </main>
  )
}

export function DashboardPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

