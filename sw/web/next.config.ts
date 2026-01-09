import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'shopping-phinf.pstatic.net' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'books.google.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'images.igdb.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/explore', destination: '/archive/explore', permanent: true },
      { source: '/feed', destination: '/archive/feed', permanent: true },
      { source: '/playground', destination: '/archive/playground', permanent: true },
      { source: '/playground/:path*', destination: '/archive/playground/:path*', permanent: true },
      { source: '/user/:path*', destination: '/archive/user/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
