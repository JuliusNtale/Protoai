"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Clock,
  CalendarDays,
  BookOpen,
  ShieldCheck,
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Wifi,
  Camera,
  Monitor,
} from "lucide-react"

// ─── mock exam data ───────────────────────────────────────────────────────────
const EXAMS = [
  {
    id: "CS301",
    code: "CS 301",
    title: "Data Structures and Algorithms",
    course: "Bachelor of Computer Science — Year 3",
    date: "Thursday, 24 April 2026",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 50,
    questionTypes: ["Multiple Choice (30)", "Short Answer (10)", "Essay (10)"],
    instructions: [
      "No electronic devices are allowed except the examination computer.",
      "You must remain in front of the camera at all times.",
      "Do not switch tabs or open other applications.",
      "Read each question carefully before answering.",
      "Answers cannot be changed once submitted.",
      "The exam will auto-submit when the timer reaches zero.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Gaze tracking", "Tab-switch detection"],
    status: "available",
    venue: "Online — Proctored",
    registeredStudents: 142,
    passMark: 40,
  },
  {
    id: "MTH202",
    code: "MTH 202",
    title: "Calculus II",
    course: "Bachelor of Computer Science — Year 2",
    date: "Friday, 25 April 2026",
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 40,
    questionTypes: ["Multiple Choice (20)", "Problem Solving (20)"],
    instructions: [
      "Scientific calculators are permitted (built-in browser calculator only).",
      "Show all workings clearly in the answer box.",
      "Partial marks are awarded for correct method.",
      "Do not switch tabs or open other applications.",
      "The exam will auto-submit when the timer reaches zero.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Tab-switch detection"],
    status: "upcoming",
    venue: "Online — Proctored",
    registeredStudents: 198,
    passMark: 40,
  },
  {
    id: "NET410",
    code: "NET 410",
    title: "Computer Networks",
    course: "Bachelor of Computer Science — Year 4",
    date: "Monday, 28 April 2026",
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    duration: "3 hours",
    totalMarks: 100,
    questions: 60,
    questionTypes: ["Multiple Choice (40)", "Short Answer (20)"],
    instructions: [
      "No external resources are permitted.",
      "You must remain in front of the camera at all times.",
      "Do not switch tabs or open other applications.",
      "The exam will auto-submit when the timer reaches zero.",
    ],
    proctoring: ["Webcam monitoring", "Screen recording", "Gaze tracking", "Tab-switch detection"],
    status: "upcoming",
    venue: "Online — Proctored",
    registeredStudents: 87,
    passMark: 40,
  },
]

type Exam = typeof EXAMS[number]

const STATUS_STYLES = {
  available: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Available Now" },
  upcoming:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Upcoming" },
  completed: { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400",    label: "Completed" },
}

export default function ExamsPage() {
  const router = useRouter()
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [starting, setStarting] = useState(false)

  function handleStart() {
    setStarting(true)
    setTimeout(() => {
      router.push("/exam")
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Top navigation bar ── */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: "#1a2d5a" }}
          >
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">AI Proctoring System</p>
            <p className="text-[10px] text-gray-400 mt-0.5">University of Dodoma</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* System checks */}
          <div className="hidden md:flex items-center gap-3">
            <SystemCheck icon={<Camera className="h-3.5 w-3.5" />} label="Camera" ok />
            <SystemCheck icon={<Monitor className="h-3.5 w-3.5" />} label="Screen" ok />
            <SystemCheck icon={<Wifi className="h-3.5 w-3.5" />} label="Network" ok />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
              BM
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-800 leading-none">B. Mwakanjuki</p>
              <p className="text-[10px] text-gray-400 mt-0.5">2021-04-00123</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="mx-auto max-w-5xl px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Examinations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select an exam to view details and begin when ready. Ensure your camera and microphone are working before starting.
          </p>
        </div>

        {/* Exam cards */}
        <div className="flex flex-col gap-4">
          {EXAMS.map(exam => {
            const s = STATUS_STYLES[exam.status as keyof typeof STATUS_STYLES]
            const isSelected = selectedExam?.id === exam.id

            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExam(isSelected ? null : exam)}
                className={`w-full text-left rounded-xl border bg-white transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? "border-blue-400 shadow-md shadow-blue-100 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* Card header row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Course icon */}
                    <div
                      className="hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                      style={{ background: "#1a2d5a" }}
                    >
                      {exam.code.split(" ")[0].slice(0, 3)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-400 tracking-wide">{exam.code}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 text-balance">{exam.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{exam.course}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                    <div className="hidden md:flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{exam.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{exam.startTime} – {exam.endTime}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isSelected && (
                  <div
                    className="border-t border-gray-100 px-5 py-5"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      {/* Column 1 — Exam at a glance */}
                      <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Exam Details</h3>
                        <dl className="flex flex-col gap-2.5">
                          <DetailRow icon={<Clock className="h-3.5 w-3.5" />}       label="Duration"    value={exam.duration} />
                          <DetailRow icon={<FileText className="h-3.5 w-3.5" />}    label="Questions"   value={`${exam.questions} questions`} />
                          <DetailRow icon={<BookOpen className="h-3.5 w-3.5" />}    label="Total Marks" value={`${exam.totalMarks} marks`} />
                          <DetailRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Pass Mark" value={`${exam.passMark}%`} />
                          <DetailRow icon={<Users className="h-3.5 w-3.5" />}       label="Registered"  value={`${exam.registeredStudents} students`} />
                          <DetailRow icon={<Monitor className="h-3.5 w-3.5" />}     label="Venue"       value={exam.venue} />
                        </dl>

                        <div className="flex flex-col gap-1 mt-1">
                          <p className="text-xs font-medium text-gray-500">Question Breakdown</p>
                          {exam.questionTypes.map(qt => (
                            <p key={qt} className="text-xs text-gray-700 pl-2 border-l-2 border-blue-200">{qt}</p>
                          ))}
                        </div>
                      </div>

                      {/* Column 2 — Instructions */}
                      <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Instructions</h3>
                        <ol className="flex flex-col gap-2">
                          {exam.instructions.map((ins, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-0.5"
                                style={{ background: "#1a2d5a" }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-xs text-gray-600 leading-relaxed">{ins}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Column 3 — Proctoring + actions */}
                      <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Proctoring Measures</h3>
                        <ul className="flex flex-col gap-2">
                          {exam.proctoring.map(p => (
                            <li key={p} className="flex items-center gap-2">
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              <span className="text-xs text-gray-600">{p}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Warning notice */}
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Your session will be recorded. Any suspicious activity will be flagged and reported to your lecturer.
                          </p>
                        </div>

                        {/* CTA */}
                        {exam.status === "available" ? (
                          <button
                            onClick={handleStart}
                            disabled={starting}
                            className="mt-auto w-full rounded-lg py-3 text-sm font-semibold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            style={{ background: "#1a2d5a" }}
                          >
                            {starting ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Starting exam...
                              </>
                            ) : (
                              <>
                                Start Exam
                                <ChevronRight className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="mt-auto flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Not yet open</p>
                              <p className="text-[10px] text-gray-400">{exam.date} at {exam.startTime}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Help notice */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-800">Technical difficulties?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Contact your examination coordinator at{" "}
              <a href="mailto:exams@udom.ac.tz" className="text-blue-600 hover:underline">
                exams@udom.ac.tz
              </a>{" "}
              or call the helpdesk at <span className="font-medium text-gray-700">+255 26 2310437</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── small helper components ─────────────────────────────────────────────────
function SystemCheck({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={ok ? "text-emerald-500" : "text-red-400"}>{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}
