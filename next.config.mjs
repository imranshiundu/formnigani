/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async rewrites() {
    return [
      // Client-side routes: serve the root page and let React handle routing
      { source: '/home', destination: '/' },
      { source: '/saved', destination: '/' },
      { source: '/profile', destination: '/' },
      { source: '/chat', destination: '/' },
      { source: '/create', destination: '/' },
      { source: '/notifs', destination: '/' },
      { source: '/form/:id', destination: '/' },
      { source: '/@:handle', destination: '/' },
    ];
  },
};

export default nextConfig;
