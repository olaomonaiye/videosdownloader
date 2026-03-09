import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { getCachedData, invalidateCache } from '../../config/redis';
import { sendSuccess } from '../../common/response';
import { updateSettingsSchema } from '../../common/schemas';
import { authMiddleware } from '../../plugins/auth';
import { getClientIP } from '../../common/utils';

export async function settingsPublicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public', async (request, reply) => {
    const settings = await getCachedData('settings:public', 300, async () => {
      const rows = await prisma.globalSetting.findMany({ where: { isPublic: true } });
      const map: Record<string, string> = {};
      for (const row of rows) {
        map[row.key] = row.value;
      }
      return map;
    });
    sendSuccess(reply, settings);
  });
}

export async function settingsAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request, reply) => {
    const group = (request.query as any).group;
    const where: any = {};
    if (group) where.group = group;
    const settings = await prisma.globalSetting.findMany({ where, orderBy: { group: 'asc' } });
    sendSuccess(reply, settings);
  });

  app.put('/', async (request, reply) => {
    const updates = updateSettingsSchema.parse(request.body);
    const results = [];
    for (const { key, value } of updates) {
      const setting = await prisma.globalSetting.update({
        where: { key },
        data: { value, updatedById: request.user!.userId },
      });
      results.push(setting);
    }
    await invalidateCache('settings:*');

    await prisma.adminActivityLog.create({
      data: {
        userId: request.user!.userId,
        action: 'settings.update',
        entityType: 'GlobalSetting',
        details: updates as any,
        ipAddress: getClientIP(request),
      },
    });

    sendSuccess(reply, results);
  });
}
