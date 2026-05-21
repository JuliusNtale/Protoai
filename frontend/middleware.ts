import { NextRequest, NextResponse } from "next/server"

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protectedPrefixes = ["/dashboard", "/lecturer", "/admin", "/exam", "/verify"]
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get("auth_token")?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  const payload = decodeJwtPayload(token)
  if (!payload) {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  const role = String(payload.role || "").toLowerCase()
  const isAdmin = role === "admin" || role === "administrator"
  if (pathname.startsWith("/admin") && !isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/lecturer") && role !== "lecturer") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/dashboard") && role !== "student") {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/lecturer/:path*", "/admin/:path*", "/exam/:path*", "/verify/:path*"],
}
