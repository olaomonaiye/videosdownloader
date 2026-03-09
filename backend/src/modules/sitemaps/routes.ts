import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { getCachedData, invalidateCache } from '../../config/redis';
import { sendSuccess } from '../../common/response';
import { authMiddleware } from '../../plugins/auth';

async function getSiteUrl(): Promise<string> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: 'site_url' } });
  return setting?.value || process.env.SITE_URL || 'http://localhost:7600';
}

async function generateServicesSitemap(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const platforms = await prisma.platform.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
  const urls = platforms.map(p =>
    `  <url>\n    <loc>${siteUrl}/${p.slug}-video-downloader</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

async function generateBlogSitemap(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', deletedAt: null, publishedAt: { lte: new Date() } },
    select: { slug: true, updatedAt: true },
  });
  const urls = posts.map(p =>
    `  <url>\n    <loc>${siteUrl}/${p.slug}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

async function generateCategoriesSitemap(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const cats = await prisma.category.findMany({ select: { slug: true, updatedAt: true } });
  const urls = cats.map(c =>
    `  <url>\n    <loc>${siteUrl}/blog/category/${c.slug}</loc>\n    <lastmod>${c.updatedAt.toISOString()}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

async function generatePagesSitemap(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const pages = await prisma.staticPage.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { slug: true, updatedAt: true },
  });
  const urls = [
    `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${siteUrl}/services</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    `  <url>\n    <loc>${siteUrl}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    `  <url>\n    <loc>${siteUrl}/library</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    ...pages.map(p =>
      `  <url>\n    <loc>${siteUrl}/pages/${p.slug}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    ),
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

async function generateSitemapIndex(): Promise<string> {
  const siteUrl = await getSiteUrl();
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>${siteUrl}/pages.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>${siteUrl}/services.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>${siteUrl}/blog.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>${siteUrl}/categories.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n</sitemapindex>`;
}

export async function sitemapRoutes(app: FastifyInstance): Promise<void> {
  const xmlHeaders = { 'Content-Type': 'application/xml; charset=utf-8' };

  app.get('/sitemap-index.xml', async (req, reply) => {
    const content = await getCachedData('sitemap:index', 3600, generateSitemapIndex);
    reply.headers(xmlHeaders).send(content);
  });

  app.get('/services.xml', async (req, reply) => {
    const content = await getCachedData('sitemap:services', 3600, generateServicesSitemap);
    reply.headers(xmlHeaders).send(content);
  });

  app.get('/blog.xml', async (req, reply) => {
    const content = await getCachedData('sitemap:blog', 3600, generateBlogSitemap);
    reply.headers(xmlHeaders).send(content);
  });

  app.get('/categories.xml', async (req, reply) => {
    const content = await getCachedData('sitemap:categories', 3600, generateCategoriesSitemap);
    reply.headers(xmlHeaders).send(content);
  });

  app.get('/pages.xml', async (req, reply) => {
    const content = await getCachedData('sitemap:pages', 3600, generatePagesSitemap);
    reply.headers(xmlHeaders).send(content);
  });

  app.get('/robots.txt', async (req, reply) => {
    const siteUrl = await getSiteUrl();
    reply.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap-index.xml`);
  });

  // XSL stylesheet for beautiful XML sitemap rendering in browsers
  app.get('/sitemap.xsl', async (req, reply) => {
    const siteUrl = await getSiteUrl();
    const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" indent="yes" encoding="UTF-8"/>
<xsl:template match="/">
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>XML Sitemap - ${siteUrl}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #a1a1aa; min-height: 100vh; }
    .header { background: #09090b; padding: 2.5rem 1.5rem; border-bottom: 1px solid #1c1c1f; }
    .header h1 { font-size: 1.5rem; font-weight: 600; color: #fafafa; letter-spacing: -0.01em; }
    .header p { margin-top: 0.5rem; color: #71717a; font-size: 0.9rem; }
    .header a { color: #d4d4d8; text-decoration: underline; text-underline-offset: 2px; }
    .header a:hover { color: #fafafa; }
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
    .stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .stat { background: #111113; border: 1px solid #1c1c1f; border-radius: 0.5rem; padding: 1rem 1.25rem; }
    .stat-value { font-size: 1.25rem; font-weight: 600; color: #fafafa; }
    .stat-label { font-size: 0.75rem; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; background: #111113; border-radius: 0.5rem; overflow: hidden; border: 1px solid #1c1c1f; }
    th { background: #141416; color: #71717a; text-align: left; padding: 0.6rem 1rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; border-bottom: 1px solid #1c1c1f; }
    td { padding: 0.55rem 1rem; border-top: 1px solid #1c1c1f; font-size: 0.85rem; color: #a1a1aa; }
    tr:hover td { background: #18181b; }
    td a { color: #d4d4d8; text-decoration: none; word-break: break-all; }
    td a:hover { color: #fafafa; text-decoration: underline; }
    .priority { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
    .priority-high { background: #18181b; color: #fafafa; border: 1px solid #3f3f46; }
    .priority-med { background: #18181b; color: #a1a1aa; border: 1px solid #27272a; }
    .priority-low { background: #111113; color: #52525b; border: 1px solid #1c1c1f; }
    .footer { text-align: center; padding: 2rem; color: #3f3f46; font-size: 0.8rem; border-top: 1px solid #1c1c1f; margin-top: 2rem; }
    .footer a { color: #71717a; text-decoration: none; }
    .footer a:hover { color: #a1a1aa; }
    @media (max-width: 640px) { .stats { flex-direction: column; } td, th { padding: 0.5rem; font-size: 0.75rem; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="max-width:1000px;margin:0 auto">
      <h1>XML Sitemap</h1>
      <p>This sitemap helps search engines discover pages on <a href="${siteUrl}">${siteUrl}</a></p>
    </div>
  </div>
  <div class="container">
    <xsl:if test="sitemap:sitemapindex">
      <div class="stats">
        <div class="stat">
          <div class="stat-value"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></div>
          <div class="stat-label">Sub-Sitemaps</div>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Sitemap URL</th><th>Last Modified</th></tr></thead>
        <tbody>
          <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
            <tr>
              <td><xsl:value-of select="position()"/></td>
              <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
              <td><xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </xsl:if>
    <xsl:if test="sitemap:urlset">
      <div class="stats">
        <div class="stat">
          <div class="stat-value"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
          <div class="stat-label">URLs</div>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>URL</th><th>Priority</th><th>Change Freq</th><th>Last Modified</th></tr></thead>
        <tbody>
          <xsl:for-each select="sitemap:urlset/sitemap:url">
            <tr>
              <td><xsl:value-of select="position()"/></td>
              <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
              <td>
                <xsl:choose>
                  <xsl:when test="sitemap:priority &gt;= 0.8"><span class="priority priority-high"><xsl:value-of select="sitemap:priority"/></span></xsl:when>
                  <xsl:when test="sitemap:priority &gt;= 0.5"><span class="priority priority-med"><xsl:value-of select="sitemap:priority"/></span></xsl:when>
                  <xsl:otherwise><span class="priority priority-low"><xsl:value-of select="sitemap:priority"/></span></xsl:otherwise>
                </xsl:choose>
              </td>
              <td><xsl:value-of select="sitemap:changefreq"/></td>
              <td><xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </xsl:if>
  </div>
  <div class="footer">
    <a href="${siteUrl}">${siteUrl}</a> &#xB7; <a href="${siteUrl}/sitemaps">All Sitemaps</a>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>`;
    reply.header('Content-Type', 'application/xml; charset=utf-8').send(xsl);
  });
}

export async function sitemapAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.post('/regenerate', async (request, reply) => {
    await invalidateCache('sitemap:*');
    sendSuccess(reply, { message: 'Sitemaps will regenerate on next request' });
  });
}

export { generateServicesSitemap, generateBlogSitemap, generateCategoriesSitemap, generatePagesSitemap, generateSitemapIndex };
