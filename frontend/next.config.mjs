/** @type {import('next').NextConfig} */
const proxyTarget = (process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")

const nextConfig = {
  allowedDevOrigins: ["192.168.0.19", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!proxyTarget) {
      return []
    }

    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
