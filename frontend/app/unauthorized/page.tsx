"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function UnauthorizedPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(165deg,#ebf2fb,#dfe9f8)] text-foreground dark:bg-[linear-gradient(165deg,#0e1526,#141d33)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(26,45,90,0.14),transparent_44%),radial-gradient(circle_at_80%_85%,rgba(56,127,172,0.16),transparent_48%)]" />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-[#c7d5ed] bg-white/95 p-7 shadow-[0_20px_45px_rgba(15,23,42,0.14)] dark:border-[#2e3544] dark:bg-[#181d28] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
          <h1 className="text-2xl font-semibold text-[#1f242c] dark:text-[#e8eaef]">Access Restricted</h1>
          <p className="mt-3 text-sm text-[#45536f] dark:text-[#b2bac7]">
            You are not authorized to access this page.
          </p>
          <p className="mt-2 text-sm text-[#45536f] dark:text-[#b2bac7]">
            Go back to login and sign in with the correct permissions.
          </p>
          <div className="mt-6">
            <Link href="/" className="inline-flex rounded-xl bg-[#1e2f4d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#192740]">
              Go To Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
