import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { sendSuccess } from '../../common/response';
import { authMiddleware } from '../../plugins/auth';

function getDateRange(range: string, startDate?: string, endDate?: string): { gte?: Date; lte?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today': return { gte: today };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { gte: y, lte: today };
    }
    case 'last7days': {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      return { gte: d };
    }
    case 'thisWeek': {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay() + 1);
      return { gte: d };
    }
    case 'lastWeek': {
      const start = new Date(today); start.setDate(start.getDate() - start.getDay() - 6);
      const end = new Date(today); end.setDate(end.getDate() - end.getDay());
      return { gte: start, lte: end };
    }
    case 'last28days': {
      const d = new Date(today); d.setDate(d.getDate() - 28);
      return { gte: d };
    }
    case 'thisMonth': return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'lastMonth': return {
      gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      lte: new Date(now.getFullYear(), now.getMonth(), 0),
    };
    case 'thisYear': return { gte: new Date(now.getFullYear(), 0, 1) };
    case 'custom':
      if (startDate && endDate) return { gte: new Date(startDate), lte: new Date(endDate) };
      return {};
    default: return {};
  }
}

export async function analyticsAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  // Dashboard stats
  app.get('/stats', async (request, reply) => {
    const q = request.query as any;
    const dateRange = getDateRange(q.range || 'all', q.startDate, q.endDate);
    const dateFilter = Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {};

    const [totalDownloads, completedDownloads, failedDownloads, activePlatforms, publishedPosts, todayDownloads] = await Promise.all([
      prisma.download.count({ where: dateFilter }),
      prisma.download.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
      prisma.download.count({ where: { ...dateFilter, status: 'FAILED' } }),
      prisma.platform.count({ where: { isActive: true } }),
      prisma.blogPost.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.download.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    sendSuccess(reply, {
      totalDownloads,
      completedDownloads,
      failedDownloads,
      failureRate: totalDownloads > 0 ? ((failedDownloads / totalDownloads) * 100).toFixed(1) : '0',
      activePlatforms,
      publishedPosts,
      todayDownloads,
    });
  });

  // Chart data - downloads over time
  app.get('/charts/downloads', async (request, reply) => {
    const q = request.query as any;
    const dateRange = getDateRange(q.range || 'last28days', q.startDate, q.endDate);
    const dateFilter = Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {};

    const downloads = await prisma.download.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: true,
    });

    // Daily aggregation via raw query
    const daily = await prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
      `SELECT DATE(\"createdAt\") as date, COUNT(*) as count FROM downloads
       ${dateRange.gte ? `WHERE "createdAt" >= '${dateRange.gte.toISOString()}'` : ''}
       ${dateRange.lte ? `AND "createdAt" <= '${dateRange.lte.toISOString()}'` : ''}
       GROUP BY DATE("createdAt") ORDER BY date ASC`
    );

    sendSuccess(reply, {
      statusBreakdown: downloads.map(d => ({ status: d.status, count: d._count })),
      daily: daily.map(d => ({ date: d.date, count: Number(d.count) })),
    });
  });

  // Top platforms
  app.get('/charts/platforms', async (request, reply) => {
    const topPlatforms = await prisma.platform.findMany({
      where: { isActive: true },
      orderBy: { downloadCount: 'desc' },
      take: 10,
      select: { name: true, slug: true, downloadCount: true },
    });
    sendSuccess(reply, topPlatforms);
  });

  // Activity logs
  app.get('/activity-logs', async (request, reply) => {
    const { page = '1', pageSize = '50' } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
        include: { user: { select: { displayName: true, email: true } } },
      }),
      prisma.adminActivityLog.count(),
    ]);
    sendSuccess(reply, logs, 200, {
      page: parseInt(page), pageSize: parseInt(pageSize),
      total, totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  });
}
