export function getApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (configuredBase) {
    const trimmedBase = configuredBase.replace(/\/+$/, "")
    return `${trimmedBase}/api${normalizedPath}`
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location
    // If frontend is accessed directly on :3000, backend is expected on :5000.
    if (port === "3000") {
      return `${protocol}//${hostname}:5000/api${normalizedPath}`
    }
  }

  return `/api${normalizedPath}`
}
