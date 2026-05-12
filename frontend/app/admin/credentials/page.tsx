"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminCredentialsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/users#generated-credentials")
  }, [router])

  return null
}

