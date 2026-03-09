import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { getCachedData, invalidateCache } from '../../config/redis';
import { sendSuccess, sendPaginated } from '../../common/response';
import { NotFoundError } from '../../common/errors';
import { parsePagination, slugify, sanitizeHtml, getClientIP } from '../../common/utils';
import { createPageSchema, updatePageSchema } from '../../common/schemas';
import { authMiddleware } from '../../plugins/auth';

export async function pagePublicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const page = await getCachedData(`page:${slug}`, 300, () =>
      prisma.staticPage.findFirst({ where: { slug, status: 'PUBLISHED', deletedAt: null } })
    );
    if (!page) throw new NotFoundError('Page');
    sendSuccess(reply, page);
  });

  app.get('/', async (request, reply) => {
    const pages = await getCachedData('pages:navigation', 300, () =>
      prisma.staticPage.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { title: true, slug: true, showInHeader: true, showInFooter: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
    );
    sendSuccess(reply, pages);
  });
}

export async function pageAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request, reply) => {
    const { page, pageSize, skip } = parsePagination(request.query as any);
    const [pages, total] = await Promise.all([
      prisma.staticPage.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' }, skip, take: pageSize }),
      prisma.staticPage.count({ where: { deletedAt: null } }),
    ]);
    sendPaginated(reply, pages, total, page, pageSize);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const page = await prisma.staticPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundError('Page');
    sendSuccess(reply, page);
  });

  app.post('/', async (request, reply) => {
    const data = createPageSchema.parse(request.body);
    const page = await prisma.staticPage.create({
      data: {
        title: data.title,
        slug: data.slug || slugify(data.title),
        content: sanitizeHtml(data.content),
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        ogImageUrl: data.ogImageUrl || null,
        status: data.status,
        showInFooter: data.showInFooter,
        showInHeader: data.showInHeader,
        sortOrder: data.sortOrder,
      },
    });
    await invalidateCache('page:*');
    await invalidateCache('pages:*');
    await prisma.adminActivityLog.create({
      data: { userId: request.user!.userId, action: 'page.create', entityType: 'StaticPage', entityId: page.id, ipAddress: getClientIP(request) },
    });
    sendSuccess(reply, page, 201);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updatePageSchema.parse(request.body);
    if (data.content) data.content = sanitizeHtml(data.content);
    const page = await prisma.staticPage.update({ where: { id }, data: data as any });
    await invalidateCache('page:*');
    await invalidateCache('pages:*');
    sendSuccess(reply, page);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.staticPage.update({ where: { id }, data: { deletedAt: new Date() } });
    await invalidateCache('page:*');
    await invalidateCache('pages:*');
    sendSuccess(reply, { message: 'Page deleted' });
  });
}
