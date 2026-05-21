"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function UnauthorizedPage() {
  const searchParams = useSearchParams()
  const reason = (searchParams.get("reason") || "").toLowerCase()
  const isRole = reason === "role"

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Access Restricted</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isRole
            ? "You do not have permission to access this page with the current account."
            : "You are not logged in, so you do not have access to this page."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please go back to the login page and sign in with proper permissions.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142145]"
          >
            Go To Login
          </Link>
        </div>
      </div>
    </main>
  )
}

