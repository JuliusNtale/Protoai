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

// socket.io-client treats any path segment in the connection URL as a
// namespace, not an HTTP path prefix - the actual handshake requests always
// go to "<origin>/socket.io/" unless a `path` option is passed separately.
// When NEXT_PUBLIC_WS_URL points at a host where the AI service is only
// reachable under a path prefix (e.g. a reverse proxy exposing it at
// "/ai/*" alongside the backend on the same domain, as in production),
// passing the URL straight into io() silently connects to the wrong path
// and the socket never opens. Split the configured URL into an origin and
// a matching "<prefix>/socket.io/" path so both line up with how the
// reverse proxy actually routes it.
export function getSocketConnection() {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim()
  const raw = configured || "http://localhost:8000"

  try {
    const parsed = new URL(raw)
    const trimmedPath = parsed.pathname.replace(/\/+$/, "")
    return { url: parsed.origin, path: `${trimmedPath}/socket.io/` }
  } catch {
    return { url: raw, path: "/socket.io/" }
  }
}
