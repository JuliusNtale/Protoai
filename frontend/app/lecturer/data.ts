// ─── Shared mock data & types for the Lecturer portal ─────────────────────────

// ── Lecturer & Subject (many-to-many) ────────────────────────────────────────
export interface Lecturer {
  id: string
  name: string
  staffId: string
  email: string
  department: string
  subjectIds: string[]   // subjects this lecturer teaches
}

export interface Subject {
  id: string
  code: string
  name: string
  programme: string
  lecturerIds: string[]  // lecturers teaching this subject
}

export const MOCK_LECTURERS: Lecturer[] = [
  { id: "l1", name: "Dr. Amina Rajabu",   staffId: "UDOM/STAFF/CS/001", email: "a.rajabu@udom.ac.tz",  department: "Computer Science", subjectIds: ["s1","s2","s3"] },
  { id: "l2", name: "Mr. Salim Kombo",    staffId: "UDOM/STAFF/CS/002", email: "s.kombo@udom.ac.tz",   department: "Computer Science", subjectIds: ["s1","s4"] },
  { id: "l3", name: "Dr. Patricia Mwale", staffId: "UDOM/STAFF/IT/003", email: "p.mwale@udom.ac.tz",   department: "Information Technology", subjectIds: ["s2","s5"] },
  { id: "l4", name: "Mr. Hassan Khamis",  staffId: "UDOM/STAFF/CS/004", email: "h.khamis@udom.ac.tz",  department: "Computer Science", subjectIds: ["s3","s4","s5"] },
]

export const MOCK_SUBJECTS: Subject[] = [
  { id: "s1", code: "CS401", name: "Advanced Algorithms",  programme: "BSc Computer Science",      lecturerIds: ["l1","l2"] },
  { id: "s2", code: "CS202", name: "Data Structures",      programme: "BSc Computer Science",      lecturerIds: ["l1","l3"] },
  { id: "s3", code: "CS303", name: "Database Systems",     programme: "BSc Computer Science",      lecturerIds: ["l1","l4"] },
  { id: "s4", code: "CS305", name: "Operating Systems",    programme: "BSc Computer Science",      lecturerIds: ["l2","l4"] },
  { id: "s5", code: "IT201", name: "Network Fundamentals", programme: "BSc Information Technology",lecturerIds: ["l3","l4"] },
]

// Helper — get lecturer display name by id
export function lecturerName(id: string): string {
  return MOCK_LECTURERS.find(l => l.id === id)?.name ?? "Unknown"
}

// Helper — get subject display label by code
export function subjectLabel(code: string): string {
  const s = MOCK_SUBJECTS.find(s => s.code === code)
  return s ? `${s.code} — ${s.name}` : code
}

export type ExamStatus = "Draft" | "Scheduled" | "Live" | "Completed"
export type QuestionType = "mcq" | "truefalse"
export type StudentStatus = "Active" | "Suspended" | "Graduated"
export type IncidentSeverity = "Low" | "Medium" | "High"

export interface Option {
  id: string
  text: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  options: Option[]
  correctIndex: number
  marks: number
}

export interface Exam {
  id: string
  title: string
  course: string
  courseCode: string
  duration: number        // minutes
  date: string
  time: string
  totalMarks: number
  passmark: number
  students: number
  submitted: number
  status: ExamStatus
  questions: Question[]
  allowCalculator: boolean
  creatorId: string       // lecturer who created the exam
  supervisorId: string    // lecturer supervising/invigilating (may differ)
}

export interface Student {
  id: string
  name: string
  regNo: string
  programme: string
  year: number
  email: string
  status: StudentStatus
  gpa: number
  examsRegistered: number
  examsCompleted: number
}

export interface ExamResult {
  studentId: string
  studentName: string
  regNo: string
  examId: string
  examTitle: string
  course: string
  score: number
  totalMarks: number
  grade: string
  passed: boolean
  submittedAt: string
  duration: number       // seconds taken
  violations: number
}

export interface MonitoringSession {
  studentId: string
  studentName: string
  regNo: string
  gazeStatus: "On Screen" | "Off Screen" | "Unknown"
  faceVisible: boolean
  tabSwitches: number
  warnings: number
  status: "Active" | "Submitted" | "Disconnected"
  progress: number       // 0–100 % questions answered
  timeLeft: string       // HH:MM:SS
}

// ─── seed data ────────────────────────────────────────────────────────────────

function opt(text: string): Option { return { id: Math.random().toString(36).slice(2), text } }
function genId() { return Math.random().toString(36).slice(2, 9) }

export const MOCK_EXAMS: Exam[] = [
  {
    id: "ex1",
    title: "Advanced Algorithms in Computer Science",
    course: "Advanced Algorithms",
    courseCode: "CS401",
    duration: 120,
    date: "2026-02-20",
    time: "09:00",
    totalMarks: 100,
    passmark: 45,
    students: 48,
    submitted: 42,
    status: "Completed",
    allowCalculator: true,
    creatorId: "l1",
    supervisorId: "l2",
    questions: [
      {
        id: "q1", type: "mcq", text: "Which of the following best describes the time complexity of QuickSort in the average case?",
        marks: 5, correctIndex: 1,
        options: [opt("O(n²) — quadratic, sorted input worst case"), opt("O(n log n) — linearithmic; expected average performance"), opt("O(n) — linear, restricted inputs only"), opt("O(log n) — logarithmic, applies to search not sort")],
      },
      {
        id: "q2", type: "mcq", text: "What data structure is used internally by Dijkstra's shortest path algorithm for optimal performance?",
        marks: 5, correctIndex: 2,
        options: [opt("Stack"), opt("Queue"), opt("Min-Heap / Priority Queue"), opt("Hash Table")],
      },
      {
        id: "q3", type: "truefalse", text: "A Binary Search Tree (BST) always guarantees O(log n) search time regardless of insertion order.",
        marks: 3, correctIndex: 1,
        options: [opt("True"), opt("False")],
      },
    ],
  },
  {
    id: "ex2",
    title: "Data Structures Mid-Semester",
    course: "Data Structures",
    courseCode: "CS202",
    duration: 90,
    date: "2026-03-10",
    time: "14:00",
    totalMarks: 80,
    passmark: 40,
    students: 56,
    submitted: 0,
    status: "Scheduled",
    allowCalculator: false,
    creatorId: "l1",
    supervisorId: "l3",
    questions: [],
  },
  {
    id: "ex3",
    title: "Database Systems Quiz 3",
    course: "Database Systems",
    courseCode: "CS303",
    duration: 45,
    date: "2026-03-25",
    time: "10:00",
    totalMarks: 40,
    passmark: 20,
    students: 0,
    submitted: 0,
    status: "Draft",
    allowCalculator: false,
    creatorId: "l4",
    supervisorId: "l4",
    questions: [],
  },
  {
    id: "ex4",
    title: "Operating Systems Final",
    course: "Operating Systems",
    courseCode: "CS305",
    duration: 150,
    date: "2026-02-14",
    time: "09:00",
    totalMarks: 100,
    passmark: 50,
    students: 38,
    submitted: 38,
    status: "Completed",
    allowCalculator: true,
    creatorId: "l2",
    supervisorId: "l4",
    questions: [],
  },
]

export const MOCK_STUDENTS: Student[] = [
  { id: "s1", name: "Baraka Mwakanjuki", regNo: "UDOM/2021/CS/001", programme: "BSc Computer Science", year: 3, email: "b.mwakanjuki@udom.ac.tz", status: "Active", gpa: 3.8, examsRegistered: 12, examsCompleted: 10 },
  { id: "s2", name: "Fatuma Ally", regNo: "UDOM/2021/CS/002", programme: "BSc Computer Science", year: 3, email: "f.ally@udom.ac.tz", status: "Active", gpa: 3.5, examsRegistered: 12, examsCompleted: 11 },
  { id: "s3", name: "John Massawe", regNo: "UDOM/2022/CS/041", programme: "BSc Information Technology", year: 2, email: "j.massawe@udom.ac.tz", status: "Active", gpa: 2.9, examsRegistered: 8, examsCompleted: 7 },
  { id: "s4", name: "Grace Kimaro", regNo: "UDOM/2021/CS/018", programme: "BSc Computer Science", year: 3, email: "g.kimaro@udom.ac.tz", status: "Active", gpa: 4.0, examsRegistered: 12, examsCompleted: 12 },
  { id: "s5", name: "Hamisi Juma", regNo: "UDOM/2022/IT/009", programme: "BSc Information Technology", year: 2, email: "h.juma@udom.ac.tz", status: "Suspended", gpa: 1.8, examsRegistered: 8, examsCompleted: 3 },
  { id: "s6", name: "Aisha Hassan", regNo: "UDOM/2021/CS/033", programme: "BSc Computer Science", year: 3, email: "a.hassan@udom.ac.tz", status: "Active", gpa: 3.2, examsRegistered: 12, examsCompleted: 10 },
  { id: "s7", name: "Kelvin Ngowi", regNo: "UDOM/2023/CS/005", programme: "BSc Computer Science", year: 1, email: "k.ngowi@udom.ac.tz", status: "Active", gpa: 3.6, examsRegistered: 4, examsCompleted: 4 },
  { id: "s8", name: "Neema Tarimo", regNo: "UDOM/2021/CS/027", programme: "BSc Computer Science", year: 3, email: "n.tarimo@udom.ac.tz", status: "Active", gpa: 2.7, examsRegistered: 12, examsCompleted: 9 },
]

export const MOCK_RESULTS: ExamResult[] = [
  { studentId: "s1", studentName: "Baraka Mwakanjuki", regNo: "UDOM/2021/CS/001", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 82, totalMarks: 100, grade: "A", passed: true, submittedAt: "2026-02-20 10:48", duration: 4320, violations: 0 },
  { studentId: "s2", studentName: "Fatuma Ally", regNo: "UDOM/2021/CS/002", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 74, totalMarks: 100, grade: "B+", passed: true, submittedAt: "2026-02-20 10:52", duration: 4980, violations: 1 },
  { studentId: "s3", studentName: "John Massawe", regNo: "UDOM/2022/CS/041", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 41, totalMarks: 100, grade: "D", passed: false, submittedAt: "2026-02-20 10:55", duration: 5100, violations: 3 },
  { studentId: "s4", studentName: "Grace Kimaro", regNo: "UDOM/2021/CS/018", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 95, totalMarks: 100, grade: "A+", passed: true, submittedAt: "2026-02-20 10:32", duration: 3780, violations: 0 },
  { studentId: "s5", studentName: "Hamisi Juma", regNo: "UDOM/2022/IT/009", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 38, totalMarks: 100, grade: "F", passed: false, submittedAt: "2026-02-20 11:00", duration: 5400, violations: 5 },
  { studentId: "s6", studentName: "Aisha Hassan", regNo: "UDOM/2021/CS/033", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 67, totalMarks: 100, grade: "B", passed: true, submittedAt: "2026-02-20 10:44", duration: 4140, violations: 1 },
  { studentId: "s7", studentName: "Kelvin Ngowi", regNo: "UDOM/2023/CS/005", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 88, totalMarks: 100, grade: "A", passed: true, submittedAt: "2026-02-20 10:39", duration: 3960, violations: 0 },
  { studentId: "s8", studentName: "Neema Tarimo", regNo: "UDOM/2021/CS/027", examId: "ex1", examTitle: "Advanced Algorithms in Computer Science", course: "CS401", score: 55, totalMarks: 100, grade: "C", passed: true, submittedAt: "2026-02-20 10:58", duration: 5280, violations: 2 },
  { studentId: "s1", studentName: "Baraka Mwakanjuki", regNo: "UDOM/2021/CS/001", examId: "ex4", examTitle: "Operating Systems Final", course: "CS305", score: 79, totalMarks: 100, grade: "B+", passed: true, submittedAt: "2026-02-14 11:28", duration: 7200, violations: 0 },
  { studentId: "s4", studentName: "Grace Kimaro", regNo: "UDOM/2021/CS/018", examId: "ex4", examTitle: "Operating Systems Final", course: "CS305", score: 91, totalMarks: 100, grade: "A+", passed: true, submittedAt: "2026-02-14 10:55", duration: 5940, violations: 0 },
]

export const MOCK_MONITORING: MonitoringSession[] = [
  { studentId: "s1", studentName: "Baraka Mwakanjuki", regNo: "UDOM/2021/CS/001", gazeStatus: "On Screen", faceVisible: true,  tabSwitches: 0, warnings: 0, status: "Active",      progress: 65, timeLeft: "00:42:33" },
  { studentId: "s2", studentName: "Fatuma Ally",        regNo: "UDOM/2021/CS/002", gazeStatus: "On Screen", faceVisible: true,  tabSwitches: 1, warnings: 1, status: "Active",      progress: 50, timeLeft: "00:42:33" },
  { studentId: "s3", studentName: "John Massawe",       regNo: "UDOM/2022/CS/041", gazeStatus: "Off Screen",faceVisible: false, tabSwitches: 3, warnings: 3, status: "Active",      progress: 30, timeLeft: "00:42:33" },
  { studentId: "s4", studentName: "Grace Kimaro",       regNo: "UDOM/2021/CS/018", gazeStatus: "On Screen", faceVisible: true,  tabSwitches: 0, warnings: 0, status: "Submitted",   progress: 100, timeLeft: "00:00:00" },
  { studentId: "s5", studentName: "Hamisi Juma",        regNo: "UDOM/2022/IT/009", gazeStatus: "Unknown",   faceVisible: false, tabSwitches: 5, warnings: 5, status: "Disconnected",progress: 40, timeLeft: "00:42:33" },
  { studentId: "s6", studentName: "Aisha Hassan",       regNo: "UDOM/2021/CS/033", gazeStatus: "On Screen", faceVisible: true,  tabSwitches: 1, warnings: 1, status: "Active",      progress: 72, timeLeft: "00:42:33" },
  { studentId: "s7", studentName: "Kelvin Ngowi",       regNo: "UDOM/2023/CS/005", gazeStatus: "On Screen", faceVisible: true,  tabSwitches: 0, warnings: 0, status: "Active",      progress: 80, timeLeft: "00:42:33" },
  { studentId: "s8", studentName: "Neema Tarimo",       regNo: "UDOM/2021/CS/027", gazeStatus: "Off Screen",faceVisible: true,  tabSwitches: 2, warnings: 2, status: "Active",      progress: 45, timeLeft: "00:42:33" },
]

export function gradeColor(grade: string): string {
  if (["A+","A"].includes(grade)) return "text-emerald-600 dark:text-emerald-400"
  if (grade === "B+" || grade === "B") return "text-blue-600 dark:text-blue-400"
  if (grade === "C") return "text-yellow-600 dark:text-yellow-400"
  if (grade === "D") return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

export function scorePercent(score: number, total: number) {
  return Math.round((score / total) * 100)
}
