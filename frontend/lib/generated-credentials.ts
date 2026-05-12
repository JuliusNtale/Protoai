export type GeneratedCredentialRow = {
  user_id?: number
  full_name: string
  role: string
  login_id: string
  temporary_password: string
  created_at: string
}

const KEY = "generated_credentials"

export function readGeneratedCredentials(): GeneratedCredentialRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendGeneratedCredential(row: Omit<GeneratedCredentialRow, "created_at">) {
  if (typeof window === "undefined") return
  const next: GeneratedCredentialRow = { ...row, created_at: new Date().toISOString() }
  const existing = readGeneratedCredentials()
  localStorage.setItem(KEY, JSON.stringify([next, ...existing].slice(0, 1000)))
}

