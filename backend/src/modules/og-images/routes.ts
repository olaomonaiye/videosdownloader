import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { NotFoundError } from '../../common/errors';

export async function ogImageRoutes(app: FastifyInstance): Promise<void> {
  app.get('/og/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    // Try to find platform
    const platform = await prisma.platform.findUnique({ where: { slug } });
    const siteName = (await prisma.globalSetting.findUnique({ where: { key: 'site_name' } }))?.value || 'VideoDownloader';

    try {
      const sharp = require('sharp');

      // Create OG image (1200x630)
      const width = 1200;
      const height = 630;
      const text = platform ? `Download ${platform.name} Videos Free` : `${siteName} - Download Any Video`;

      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#ffffff"/>
          <rect x="0" y="0" width="100%" height="6" fill="#2563eb"/>
          <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#1e293b" text-anchor="middle">${escapeXml(text)}</text>
          <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="24" fill="#64748b" text-anchor="middle">${escapeXml(siteName)}</text>
          <rect x="0" y="${height - 6}" width="100%" height="6" fill="#2563eb"/>
        </svg>`;

      const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

      reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=86400')
        .send(buffer);
    } catch (err) {
      // Fallback: redirect to default OG
      reply.redirect('/images/og-default.png');
    }
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
