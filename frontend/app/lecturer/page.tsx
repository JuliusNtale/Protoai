"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Plus, Users } from "lucide-react"
import { getApiPath } from "@/lib/api-url"

type MeUser = {
  user_id: number
  full_name: string
  role: string
}

type ExamRow = {
  exam_id: number
  title: string
  course_code: string
  duration_min: number
  scheduled_at?: string | null
  status: string
}

type QuestionRow = {
  question_id: number
  question_text: string
  question_type: string
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  correct_answer?: string
  marks: number
  order_num: number
}

type StudentRow = {
  user_id: number
  full_name: string
  registration_number: string
  email: string
  session_status: string
  score?: number | null
  warning_count: number
}

export default function LecturerDashboard() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [me, setMe] = useState<MeUser | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [newTitle, setNewTitle] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newDuration, setNewDuration] = useState("60")
  const [newSchedule, setNewSchedule] = useState("")

  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [questionText, setQuestionText] = useState("")
  const [questionType, setQuestionType] = useState<"mcq" | "true_false">("mcq")
  const [optionA, setOptionA] = useState("")
  const [optionB, setOptionB] = useState("")
  const [optionC, setOptionC] = useState("")
  const [optionD, setOptionD] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [marks, setMarks] = useState("1")

  useEffect(() => {
    const rawToken = localStorage.getItem("token")
    if (!rawToken) {
      router.push("/")
      return
    }
    setToken(rawToken)
    void load(rawToken)
  }, [router])

  async function load(activeToken: string) {
    setLoading(true)
    try {
      const [meRes, examsRes] = await Promise.all([
        fetch(getApiPath("/auth/me"), { headers: { Authorization: `Bearer ${activeToken}` } }),
        fetch(getApiPath("/exams"), { headers: { Authorization: `Bearer ${activeToken}` } }),
      ])
      const mePayload = await meRes.json().catch(() => ({}))
      const examsPayload = await examsRes.json().catch(() => ({}))
      if (!meRes.ok) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/")
        return
      }
      if (mePayload?.user?.role === "administrator" || mePayload?.user?.role === "admin") {
        router.push("/admin")
        return
      }
      if (mePayload?.user?.role !== "lecturer") {
        router.push("/dashboard")
        return
      }
      setMe(mePayload.user)
      const rows = examsPayload.exams || []
      setExams(rows)
      if (rows.length > 0) {
        const first = rows[0].exam_id
        setSelectedExamId(first)
        await loadExamDetails(activeToken, first)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadExamDetails(activeToken: string, examId: number) {
    const [examRes, studentsRes] = await Promise.all([
      fetch(getApiPath(`/exams/${examId}`), { headers: { Authorization: `Bearer ${activeToken}` } }),
      fetch(getApiPath(`/exams/${examId}/students`), { headers: { Authorization: `Bearer ${activeToken}` } }),
    ])
    const examPayload = await examRes.json().catch(() => ({}))
    const studentsPayload = await studentsRes.json().catch(() => ({}))
    if (examRes.ok) setQuestions(examPayload.questions || [])
    if (studentsRes.ok) setStudents(studentsPayload.students || [])
  }

  async function createExam() {
    if (!newTitle || !newCourseCode) return
    const res = await fetch(getApiPath("/exams"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: newTitle,
        course_code: newCourseCode,
        duration_min: Number(newDuration),
        scheduled_at: newSchedule || undefined,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not create exam.")
      return
    }
    setNewTitle("")
    setNewCourseCode("")
    setNewDuration("60")
    setNewSchedule("")
    await load(token)
  }

  async function createQuestion() {
    if (!selectedExamId || !questionText || !correctAnswer) return
    const res = await fetch(getApiPath(`/exams/${selectedExamId}/questions`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        question_text: questionText,
        question_type: questionType,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        marks: Number(marks),
        order_num: questions.length + 1,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload?.error?.message || "Could not create question.")
      return
    }
    setQuestionText("")
    setOptionA("")
    setOptionB("")
    setOptionC("")
    setOptionD("")
    setCorrectAnswer("")
    setMarks("1")
    await loadExamDetails(token, selectedExamId)
  }

  async function deleteQuestion(questionId: number) {
    if (!selectedExamId) return
    const res = await fetch(getApiPath(`/exams/${selectedExamId}/questions/${questionId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await loadExamDetails(token, selectedExamId)
  }

  const selectedExam = useMemo(
    () => exams.find(e => e.exam_id === selectedExamId) || null,
    [exams, selectedExamId]
  )

  if (loading) {
    return <main className="min-h-screen bg-[#f4f5f7] p-6"><div className="mx-auto max-w-6xl rounded-xl border bg-white p-5 text-sm text-gray-500">Loading lecturer dashboard...</div></main>
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h1 className="text-xl font-semibold">Lecturer Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">{me?.full_name}</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <StatCard label="My Exams" value={exams.length} />
          <StatCard label="Questions (Selected Exam)" value={questions.length} />
          <StatCard label="Students (Selected Exam)" value={students.length} />
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Create Exam</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Exam title" className="rounded-md border p-2 text-sm" />
            <input value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} placeholder="Course code" className="rounded-md border p-2 text-sm" />
            <input value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="Duration minutes" className="rounded-md border p-2 text-sm" />
            <input value={newSchedule} onChange={e => setNewSchedule(e.target.value)} placeholder="Scheduled at ISO (optional)" className="rounded-md border p-2 text-sm" />
          </div>
          <button onClick={createExam} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">Create Exam</button>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">My Exam List</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Title</th>
                  <th>Course</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.exam_id} className="border-b">
                    <td className="py-2">{exam.title}</td>
                    <td>{exam.course_code}</td>
                    <td>{exam.scheduled_at ? new Date(exam.scheduled_at).toLocaleString() : "TBD"}</td>
                    <td>{exam.status}</td>
                    <td>
                      <button
                        onClick={async () => {
                          setSelectedExamId(exam.exam_id)
                          await loadExamDetails(token, exam.exam_id)
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-500">No exams created yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <h2 className="text-lg font-semibold">Question Builder {selectedExam ? `- ${selectedExam.title}` : ""}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select value={questionType} onChange={e => setQuestionType(e.target.value as "mcq" | "true_false")} className="rounded-md border p-2 text-sm">
              <option value="mcq">mcq</option>
              <option value="true_false">true_false</option>
            </select>
            <input value={marks} onChange={e => setMarks(e.target.value)} placeholder="Marks" className="rounded-md border p-2 text-sm" />
            <input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Question text" className="rounded-md border p-2 text-sm md:col-span-2" />
            <input value={optionA} onChange={e => setOptionA(e.target.value)} placeholder="Option A" className="rounded-md border p-2 text-sm" />
            <input value={optionB} onChange={e => setOptionB(e.target.value)} placeholder="Option B" className="rounded-md border p-2 text-sm" />
            {questionType === "mcq" && <input value={optionC} onChange={e => setOptionC(e.target.value)} placeholder="Option C" className="rounded-md border p-2 text-sm" />}
            {questionType === "mcq" && <input value={optionD} onChange={e => setOptionD(e.target.value)} placeholder="Option D" className="rounded-md border p-2 text-sm" />}
            <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="Correct answer (e.g. A or TRUE)" className="rounded-md border p-2 text-sm md:col-span-2" />
          </div>
          <button onClick={createQuestion} disabled={!selectedExamId} className="mt-3 rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Add Question
          </button>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Correct</th>
                  <th>Marks</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.question_id} className="border-b">
                    <td className="py-2">{q.order_num}</td>
                    <td>{q.question_text}</td>
                    <td>{q.question_type}</td>
                    <td>{q.correct_answer}</td>
                    <td>{q.marks}</td>
                    <td><button onClick={() => deleteQuestion(q.question_id)} className="rounded border px-2 py-1 text-xs">Delete</button></td>
                  </tr>
                ))}
                {questions.length === 0 && <tr><td colSpan={6} className="py-3 text-gray-500">No questions for selected exam.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold">Enrolled Students {selectedExam ? `- ${selectedExam.title}` : ""}</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Name</th>
                  <th>Reg Number</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.user_id} className="border-b">
                    <td className="py-2">{s.full_name}</td>
                    <td>{s.registration_number}</td>
                    <td>{s.email}</td>
                    <td>{s.session_status}</td>
                    <td>{s.score ?? "-"}</td>
                    <td>{s.warning_count}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={6} className="py-3 text-gray-500">No students enrolled yet (students appear after starting session).</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
