/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];  // required for html-pdf
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  }
};

module.exports = nextConfig;
