"use client"

import Link from "next/link"

export default function RegisterDisabledPage() {
  return (
    <main className="min-h-screen bg-[#ecf1f8] p-4 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_rgba(15,23,42,0.12)] md:p-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-7 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Self Registration Disabled</h1>
          <p className="mt-2 text-sm text-slate-600">
          Accounts are provisioned by the administrator. Contact your department or exam office for credentials.
          </p>
          <Link href="/" className="mt-5 inline-block rounded-xl bg-[#1a2d5a] px-5 py-2.5 text-sm font-semibold text-white">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
