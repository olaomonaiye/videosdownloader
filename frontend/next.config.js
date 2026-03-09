/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/:path*`,
      },
      { source: '/sitemap-index.xml', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/sitemap-index.xml` },
      { source: '/services.xml', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/services.xml` },
      { source: '/blog.xml', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/blog.xml` },
      { source: '/categories.xml', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/categories.xml` },
      { source: '/pages.xml', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/pages.xml` },
      { source: '/robots.txt', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/robots.txt` },
      { source: '/sitemap.xsl', destination: `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/sitemap.xsl` },
    ];
  },
};

module.exports = nextConfig;
