/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    domains: [],
  },
  async redirects() {
    return [
      {
        source: '/user/profil/:username',
        destination: '/profil/:username',
        permanent: true,
      },
      {
        source: '/user/:username',
        destination: '/profil/:username',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
