"use client"

import { useState } from "react"
import {
  Users, ShieldAlert, ShieldCheck, Activity, Search, Filter,
  TrendingUp, Eye, Move, Monitor, AlertTriangle, Download
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

const students = [
  { id: 1, name: "Amara Osei", regNum: "CS/2021/001", gaze: 12, headMove: 5, tabSwitch: 3, risk: "High" },
  { id: 2, name: "David Kim", regNum: "CS/2021/002", gaze: 4, headMove: 2, tabSwitch: 0, risk: "Low" },
  { id: 3, name: "Fatima Al-Hassan", regNum: "CS/2021/003", gaze: 7, headMove: 6, tabSwitch: 1, risk: "Medium" },
  { id: 4, name: "James Thornton", regNum: "CS/2021/004", gaze: 0, headMove: 1, tabSwitch: 0, risk: "Low" },
  { id: 5, name: "Layla Nkosi", regNum: "CS/2021/005", gaze: 15, headMove: 9, tabSwitch: 5, risk: "High" },
  { id: 6, name: "Marcus Chen", regNum: "CS/2021/006", gaze: 3, headMove: 2, tabSwitch: 0, risk: "Low" },
  { id: 7, name: "Nina Petrov", regNum: "CS/2021/007", gaze: 8, headMove: 4, tabSwitch: 2, risk: "Medium" },
  { id: 8, name: "Omar Diallo", regNum: "CS/2021/008", gaze: 11, headMove: 7, tabSwitch: 4, risk: "High" },
  { id: 9, name: "Priya Sharma", regNum: "CS/2021/009", gaze: 2, headMove: 1, tabSwitch: 0, risk: "Low" },
  { id: 10, name: "Tomás Rivera", regNum: "CS/2021/010", gaze: 6, headMove: 5, tabSwitch: 1, risk: "Medium" },
]

const barData = students.map(s => ({ name: s.name.split(" ")[0], gaze: s.gaze, head: s.headMove, tab: s.tabSwitch }))

const pieData = [
  { name: "Low Risk", value: students.filter(s => s.risk === "Low").length },
  { name: "Medium Risk", value: students.filter(s => s.risk === "Medium").length },
  { name: "High Risk", value: students.filter(s => s.risk === "High").length },
]
const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"]

const riskConfig = {
  High: { className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", dot: "bg-red-500" },
  Medium: { className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  Low: { className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", dot: "bg-green-500" },
}

const stats = [
  { label: "Total Sessions", value: "24", sub: "Active exam sessions", icon: Activity, color: "text-primary bg-primary/10" },
  { label: "Flagged Students", value: "3", sub: "High risk detected", icon: ShieldAlert, color: "text-destructive bg-destructive/10" },
  { label: "Clean Sessions", value: "18", sub: "No violations", icon: ShieldCheck, color: "text-green-600 dark:text-green-400 bg-green-500/10" },
  { label: "Total Students", value: students.length.toString(), sub: "Enrolled this exam", icon: Users, color: "text-primary bg-primary/10" },
]

export default function AdminDashboard() {
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<"All" | "High" | "Medium" | "Low">("All")

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.regNum.toLowerCase().includes(search.toLowerCase())
    const matchRisk = riskFilter === "All" || s.risk === riskFilter
    return matchSearch && matchRisk
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="admin" userName="Dr. Admin" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Real-time proctoring overview — Computer Science Final Exam 2024</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          {/* Bar chart */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Violation Breakdown</h2>
                <p className="text-xs text-muted-foreground">Gaze, head movement, and tab switches per student</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={6} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                />
                <Bar dataKey="gaze" name="Gaze Alerts" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="head" name="Head Moves" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tab" name="Tab Switches" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Risk Distribution</h2>
              <p className="text-xs text-muted-foreground">Students by risk level</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Student Sessions</h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search student…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-48 rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Risk filter */}
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {(["All", "High", "Medium", "Low"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setRiskFilter(f)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      riskFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Student", "Reg. Number", "Gaze Alerts", "Head Moves", "Tab Switches", "Risk Level", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className="group hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {s.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{s.regNum}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn("font-medium", s.gaze > 8 ? "text-destructive" : "text-foreground")}>{s.gaze}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Move className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn("font-medium", s.headMove > 6 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground")}>{s.headMove}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn("font-medium", s.tabSwitch > 2 ? "text-destructive" : "text-foreground")}>{s.tabSwitch}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", riskConfig[s.risk as keyof typeof riskConfig].className)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", riskConfig[s.risk as keyof typeof riskConfig].dot)} />
                        {s.risk}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">No students match your search or filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">Showing {filtered.length} of {students.length} students</p>
          </div>
        </div>
      </main>
    </div>
  )
}
