/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];  // required for html-pdf
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  env: {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
  }
};

module.exports = nextConfig;
