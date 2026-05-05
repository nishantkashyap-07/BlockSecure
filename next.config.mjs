/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@emailjs/browser'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['res.cloudinary.com'],
  },
}

export default nextConfig
