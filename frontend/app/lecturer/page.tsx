"use client"

import { useState } from "react"
import {
  Plus, Trash2, CheckCircle, BookOpen, Users, Clock, MoreVertical,
  ChevronDown, GripVertical, Edit3, Eye, X
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type QuestionType = "mcq" | "truefalse"

interface Option {
  id: string
  text: string
}

interface Question {
  id: string
  type: QuestionType
  text: string
  options: Option[]
  correctIndex: number
}

interface Exam {
  id: string
  title: string
  course: string
  duration: number
  date: string
  students: number
  status: "Draft" | "Published" | "Completed"
}

const initExams: Exam[] = [
  { id: "1", title: "Computer Science Final Exam 2024", course: "CS101", duration: 120, date: "2024-06-15", students: 48, status: "Published" },
  { id: "2", title: "Data Structures Mid-Semester", course: "CS202", duration: 90, date: "2024-05-20", students: 32, status: "Completed" },
  { id: "3", title: "Database Systems Quiz 3", course: "CS303", duration: 45, date: "2024-07-01", students: 0, status: "Draft" },
]

const statusConfig = {
  Draft: "bg-muted text-muted-foreground border-border",
  Published: "bg-primary/10 text-primary border-primary/30",
  Completed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
}

function genId() { return Math.random().toString(36).slice(2, 8) }

function newMCQ(): Question {
  return {
    id: genId(), type: "mcq", text: "", correctIndex: 0,
    options: [{ id: genId(), text: "" }, { id: genId(), text: "" }, { id: genId(), text: "" }, { id: genId(), text: "" }],
  }
}

function newTF(): Question {
  return {
    id: genId(), type: "truefalse", text: "", correctIndex: 0,
    options: [{ id: genId(), text: "True" }, { id: genId(), text: "False" }],
  }
}

export default function LecturerDashboard() {
  const [exams, setExams] = useState<Exam[]>(initExams)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [examTitle, setExamTitle] = useState("")
  const [examCourse, setExamCourse] = useState("")
  const [examDuration, setExamDuration] = useState("60")
  const [examDate, setExamDate] = useState("")
  const [questions, setQuestions] = useState<Question[]>([newMCQ()])
  const [saving, setSaving] = useState(false)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  function addQuestion(type: QuestionType) {
    const q = type === "mcq" ? newMCQ() : newTF()
    setQuestions(qs => [...qs, q])
    setExpandedQ(q.id)
  }

  function removeQuestion(id: string) {
    setQuestions(qs => qs.filter(q => q.id !== id))
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  function updateOption(qId: string, optId: string, text: string) {
    setQuestions(qs => qs.map(q => q.id === qId
      ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) }
      : q
    ))
  }

  function handleSaveDraft() {
    setSaving(true)
    setTimeout(() => {
      setExams(e => [
        { id: genId(), title: examTitle || "Untitled Exam", course: examCourse || "—", duration: Number(examDuration), date: examDate || "TBD", students: 0, status: "Draft" },
        ...e,
      ])
      setSaving(false)
      setBuilderOpen(false)
      setExamTitle(""); setExamCourse(""); setExamDuration("60"); setExamDate("")
      setQuestions([newMCQ()])
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="lecturer" userName="Dr. Mensah" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lecturer Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your exams and questions</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 gap-2" onClick={() => setBuilderOpen(true)}>
            <Plus className="h-4 w-4" /> Create Exam
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Exams", value: exams.length, icon: BookOpen, color: "text-primary bg-primary/10" },
            { label: "Total Students", value: exams.reduce((a, e) => a + e.students, 0), icon: Users, color: "text-green-600 dark:text-green-400 bg-green-500/10" },
            { label: "Total Duration (avg)", value: `${Math.round(exams.reduce((a, e) => a + e.duration, 0) / exams.length)} min`, icon: Clock, color: "text-primary bg-primary/10" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Exams list */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">My Exams</h2>
          </div>
          <div className="divide-y divide-border">
            {exams.map(exam => (
              <div key={exam.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-accent/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{exam.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{exam.course}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.duration} min</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{exam.students} students</span>
                      <span>{exam.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", statusConfig[exam.status])}>
                    {exam.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View exam">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit exam">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Question Builder Drawer/Modal */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-card shadow-2xl">
            {/* Drawer header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Create New Exam</h2>
                <p className="text-xs text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""} added</p>
              </div>
              <button onClick={() => setBuilderOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Exam details */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Exam Details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Exam Title</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      placeholder="e.g. Final Exam 2024"
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Course Code</label>
                    <input
                      type="text"
                      value={examCourse}
                      onChange={e => setExamCourse(e.target.value)}
                      placeholder="e.g. CS101"
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
                    <input
                      type="number"
                      value={examDuration}
                      onChange={e => setExamDuration(e.target.value)}
                      min={15}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Exam Date</label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={e => setExamDate(e.target.value)}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Questions</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => addQuestion("truefalse")} className="h-8 text-xs gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> True/False
                    </Button>
                    <Button size="sm" onClick={() => addQuestion("mcq")} className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-3.5 w-3.5" /> MCQ
                    </Button>
                  </div>
                </div>

                {questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border border-border bg-background overflow-hidden">
                    {/* Question header */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                    >
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{qi + 1}</span>
                      <span className={cn("flex-1 truncate text-sm", q.text ? "text-foreground" : "text-muted-foreground")}>
                        {q.text || "Enter your question…"}
                      </span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground border-border">
                        {q.type === "mcq" ? "MCQ" : "T/F"}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedQ === q.id && "rotate-180")} />
                      <button
                        onClick={e => { e.stopPropagation(); removeQuestion(q.id) }}
                        className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Expanded editor */}
                    {expandedQ === q.id && (
                      <div className="border-t border-border px-4 py-4 space-y-3">
                        {/* Question text */}
                        <textarea
                          value={q.text}
                          onChange={e => updateQuestion(q.id, { text: e.target.value })}
                          rows={2}
                          placeholder="Type your question here…"
                          className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        {/* Options */}
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-medium text-muted-foreground">Answer Options — click circle to mark correct</p>
                          {q.options.map((opt, oi) => (
                            <div key={opt.id} className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => updateQuestion(q.id, { correctIndex: oi })}
                                className={cn(
                                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                  q.correctIndex === oi
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-border text-transparent hover:border-primary"
                                )}
                                aria-label="Mark as correct"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              {q.type === "truefalse" ? (
                                <span className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">{opt.text}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={e => updateOption(q.id, opt.id, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                  className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              )}
                              {q.correctIndex === oi && (
                                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">No questions yet</p>
                    <p className="text-xs text-muted-foreground">Click &quot;MCQ&quot; or &quot;True/False&quot; above to add a question</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-card px-6 py-4">
              <p className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Saving…
                    </span>
                  ) : "Save as Draft"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
