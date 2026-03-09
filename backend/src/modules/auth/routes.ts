import { FastifyInstance } from 'fastify';
import * as bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { loginSchema } from '../../common/schemas';
import { sendSuccess, sendError } from '../../common/response';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../common/errors';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, authMiddleware } from '../../plugins/auth';
import { getClientIP } from '../../common/utils';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(200),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR']).default('EDITOR'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  displayName: z.string().min(1).max(200).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR']).optional(),
  isActive: z.boolean().optional(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/admin/auth/login
  app.post('/login', {
    config: { rateLimit: { max: env.RATE_LIMIT_LOGIN, timeWindow: 15 * 60 * 1000 } },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        userId: user.id,
        action: 'auth.login',
        ipAddress: getClientIP(request),
      },
    });

    // Set cookies
    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 365 days
    });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 365 days
    });

    sendSuccess(reply, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  });

  // POST /api/v1/admin/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const token = (request as any).cookies?.refresh_token || (request.body as any)?.refreshToken;
    if (!token) throw new UnauthorizedError('Refresh token required');

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(newPayload);
    const refreshToken = generateRefreshToken(newPayload);

    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 365 * 24 * 60 * 60,
    });
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 365 * 24 * 60 * 60,
    });

    sendSuccess(reply, { accessToken, refreshToken });
  });

  // POST /api/v1/admin/auth/logout
  app.post('/logout', { preHandler: [authMiddleware] }, async (request, reply) => {
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    if (request.user) {
      await prisma.adminActivityLog.create({
        data: {
          userId: request.user.userId,
          action: 'auth.logout',
          ipAddress: getClientIP(request),
        },
      });
    }

    sendSuccess(reply, { message: 'Logged out successfully' });
  });

  // GET /api/v1/admin/auth/me
  app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, lastLoginAt: true },
    });
    if (!user) throw new UnauthorizedError('User not found');
    sendSuccess(reply, user);
  });
}

// ── Admin User Management Routes ──
export async function userAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/admin/users
  app.get('/', async (request, reply) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, displayName: true, role: true,
        avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    });
    sendSuccess(reply, users);
  });

  // POST /api/v1/admin/users
  app.post('/', async (request, reply) => {
    const data = createUserSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ValidationError('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        role: data.role as any,
      },
      select: { id: true, email: true, displayName: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.adminActivityLog.create({
      data: { userId: request.user!.userId, action: 'user.create', entityType: 'User', entityId: user.id, ipAddress: getClientIP(request) },
    });

    sendSuccess(reply, user, 201);
  });

  // PUT /api/v1/admin/users/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateUserSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User');

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, displayName: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.adminActivityLog.create({
      data: { userId: request.user!.userId, action: 'user.update', entityType: 'User', entityId: id, ipAddress: getClientIP(request) },
    });

    sendSuccess(reply, user);
  });

  // DELETE /api/v1/admin/users/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Prevent self-deletion
    if (id === request.user!.userId) {
      throw new ValidationError('Cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User');

    await prisma.user.delete({ where: { id } });

    await prisma.adminActivityLog.create({
      data: { userId: request.user!.userId, action: 'user.delete', entityType: 'User', entityId: id, ipAddress: getClientIP(request) },
    });

    sendSuccess(reply, { message: 'User deleted' });
  });
}
