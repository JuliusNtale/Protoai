/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.0.19", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
