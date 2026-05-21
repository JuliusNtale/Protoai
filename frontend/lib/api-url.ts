export function getApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (configuredBase) {
    const trimmedBase = configuredBase.replace(/\/+$/, "")
    return `${trimmedBase}/api${normalizedPath}`
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    // Development fallback when frontend is opened on localhost without NEXT_PUBLIC_API_URL.
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5000/api${normalizedPath}`
    }
  }

  return `/api${normalizedPath}`
}
