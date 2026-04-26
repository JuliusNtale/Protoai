export function getApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!configuredBase) {
    return `/api${normalizedPath}`
  }

  const trimmedBase = configuredBase.replace(/\/+$/, "")
  return `${trimmedBase}/api${normalizedPath}`
}
