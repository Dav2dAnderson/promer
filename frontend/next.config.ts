import type { NextConfig } from 'next'

const config: NextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: 'http://127.0.0.1:8000/api/:path*/' // Proxy to Backend
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*' // Proxy to Backend without trailing slash
      }
    ]
  }
}

export default config
