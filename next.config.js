/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    RIMAI_API_URL: process.env.RIMAI_API_URL || 'https://rimai-backend-production.up.railway.app',
  },
}

module.exports = nextConfig
