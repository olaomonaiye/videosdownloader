import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { getCachedData, invalidateCache } from '../../config/redis';
import { sendSuccess, sendPaginated } from '../../common/response';
import { NotFoundError } from '../../common/errors';
import { parsePagination, slugify, getClientIP } from '../../common/utils';
import { updatePlatformSchema } from '../../common/schemas';
import { authMiddleware } from '../../plugins/auth';

// ── Public Routes ──
export async function platformPublicRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/platforms/count — MUST be registered BEFORE /:slug
  app.get('/count', async (request, reply) => {
    const count = await getCachedData('platforms:count', 300, () =>
      prisma.platform.count({ where: { isActive: true } })
    );
    sendSuccess(reply, { count });
  });

  // GET /api/v1/platforms
  app.get('/', async (request, reply) => {
    const { page, pageSize, skip } = parsePagination(request.query as any, 500);
    const search = (request.query as any).search || '';
    const sort = (request.query as any).sort || 'name';
    const order = (request.query as any).order || 'asc';

    const where: any = { isActive: true };
    if (search) {
      where.name = { contains: search };
    }

    const total = await prisma.platform.count({ where });

    // For default name sort, prioritize: top platforms first, then those with logos, then alphabetical
    if (sort === 'name' && order === 'asc' && !search) {
      const TOP_SLUGS = ['youtube', 'instagram', 'tiktok', 'facebook', 'twitter', 'vimeo', 'reddit', 'twitch', 'dailymotion', 'pinterest', 'soundcloud', 'spotify'];

      const allPlatforms = await prisma.platform.findMany({
        where,
        select: {
          id: true, name: true, slug: true, logoUrl: true,
          description: true, isActive: true,
        },
      });

      // Sort: top slugs first (in order), then platforms with logos (A-Z), then rest (A-Z)
      allPlatforms.sort((a, b) => {
        const aTopIdx = TOP_SLUGS.indexOf(a.slug);
        const bTopIdx = TOP_SLUGS.indexOf(b.slug);
        if (aTopIdx !== -1 && bTopIdx !== -1) return aTopIdx - bTopIdx;
        if (aTopIdx !== -1) return -1;
        if (bTopIdx !== -1) return 1;
        const aHasLogo = a.logoUrl ? 0 : 1;
        const bHasLogo = b.logoUrl ? 0 : 1;
        if (aHasLogo !== bHasLogo) return aHasLogo - bHasLogo;
        return a.name.localeCompare(b.name);
      });

      const paginated = allPlatforms.slice(skip, skip + pageSize);
      sendPaginated(reply, paginated, total, page, pageSize);
      return;
    }

    const orderBy: any = {};
    if (sort === 'recent') orderBy.createdAt = order;
    else orderBy.name = order;

    const platforms = await prisma.platform.findMany({
      where, orderBy, skip, take: pageSize,
      select: {
        id: true, name: true, slug: true, logoUrl: true,
        description: true, isActive: true,
      },
    });

    sendPaginated(reply, platforms, total, page, pageSize);
  });

  // GET /api/v1/platforms/:slug
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const platform = await getCachedData(`platform:${slug}`, 300, async () => {
      return prisma.platform.findUnique({
        where: { slug },
        select: {
          id: true, name: true, slug: true, logoUrl: true,
          description: true, metaTitle: true, metaDescription: true,
          faqJson: true, supportedFormats: true,
        },
      });
    });

    if (!platform) throw new NotFoundError('Platform');
    sendSuccess(reply, platform);
  });
}

// ── Admin Routes ──
export async function platformAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/admin/platforms
  app.get('/', async (request, reply) => {
    const { page, pageSize, skip } = parsePagination(request.query as any, 500);
    const search = (request.query as any).search || '';

    const where: any = {};
    if (search) {
      where.name = { contains: search };
    }

    const [platforms, total] = await Promise.all([
      prisma.platform.findMany({
        where, orderBy: { sortOrder: 'asc' }, skip, take: pageSize,
      }),
      prisma.platform.count({ where }),
    ]);

    sendPaginated(reply, platforms, total, page, pageSize);
  });

  // GET /api/v1/admin/platforms/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const platform = await prisma.platform.findUnique({ where: { id } });
    if (!platform) throw new NotFoundError('Platform');
    sendSuccess(reply, platform);
  });

  // PUT /api/v1/admin/platforms/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updatePlatformSchema.parse(request.body);

    const platform = await prisma.platform.update({
      where: { id },
      data: {
        ...data,
        slug: data.slug || (data.name ? slugify(data.name) : undefined),
      },
    });

    await invalidateCache('platform:*');
    await invalidateCache('platforms:*');

    await prisma.adminActivityLog.create({
      data: {
        userId: request.user!.userId,
        action: 'platform.update',
        entityType: 'Platform',
        entityId: id,
        details: data as any,
        ipAddress: getClientIP(request),
      },
    });

    sendSuccess(reply, platform);
  });

  // POST /api/v1/admin/platforms
  app.post('/', async (request, reply) => {
    const data = updatePlatformSchema.parse(request.body);

    const platform = await prisma.platform.create({
      data: {
        name: data.name || 'New Platform',
        slug: data.slug || slugify(data.name || 'new-platform'),
        description: data.description || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        logoUrl: data.logoUrl || null,
        faqJson: data.faqJson || null,
        isActive: data.isActive ?? false,
        sortOrder: data.sortOrder ?? 0,
        supportedFormats: data.supportedFormats || null,
      },
    });

    await invalidateCache('platform:*');
    await invalidateCache('platforms:*');

    sendSuccess(reply, platform, 201);
  });

  // DELETE /api/v1/admin/platforms/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.platform.delete({ where: { id } });
    await invalidateCache('platform:*');
    await invalidateCache('platforms:*');

    await prisma.adminActivityLog.create({
      data: {
        userId: request.user!.userId,
        action: 'platform.delete',
        entityType: 'Platform',
        entityId: id,
        ipAddress: getClientIP(request),
      },
    });

    sendSuccess(reply, { message: 'Platform deleted' });
  });
}
