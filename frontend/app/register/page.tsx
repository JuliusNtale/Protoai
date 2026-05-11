"use client"

import Link from "next/link"

export default function RegisterDisabledPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f5f7] px-4">
      <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Self Registration Disabled</h1>
        <p className="mt-2 text-sm text-gray-600">
          Accounts are provisioned by the administrator. Contact your department or exam office for credentials.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-[#1a2d5a] px-4 py-2 text-sm font-semibold text-white">
          Back to Login
        </Link>
      </div>
    </main>
  )
}
