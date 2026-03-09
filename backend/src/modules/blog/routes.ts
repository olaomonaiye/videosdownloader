import { FastifyInstance } from 'fastify';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import prisma from '../../config/database';
import { getCachedData, invalidateCache } from '../../config/redis';
import { sendSuccess, sendPaginated } from '../../common/response';
import { NotFoundError, ValidationError } from '../../common/errors';
import { parsePagination, slugify, calculateReadingTime, sanitizeHtml, getClientIP } from '../../common/utils';
import { createPostSchema, updatePostSchema, createCategorySchema, updateCategorySchema } from '../../common/schemas';
import { authMiddleware } from '../../plugins/auth';
import { env } from '../../config/env';

// ── Public Blog Routes ──
export async function blogPublicRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/blog/posts
  app.get('/posts', async (request, reply) => {
    const { page, pageSize, skip } = parsePagination(request.query as any);
    const category = (request.query as any).category;
    const tag = (request.query as any).tag;
    const search = (request.query as any).search;

    const where: any = { status: 'PUBLISHED', publishedAt: { lte: new Date() }, deletedAt: null };
    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where, orderBy: { publishedAt: 'desc' }, skip, take: pageSize,
        select: {
          id: true, title: true, slug: true, excerpt: true, thumbnailUrl: true,
          publishedAt: true, readingTimeMinutes: true, viewCount: true,
          author: { select: { displayName: true, avatarUrl: true } },
          categories: { select: { category: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    const mapped = posts.map(p => ({
      ...p,
      categories: p.categories.map(c => c.category),
    }));

    sendPaginated(reply, mapped, total, page, pageSize);
  });

  // GET /api/v1/blog/posts/:slug
  app.get('/posts/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED', publishedAt: { lte: new Date() }, deletedAt: null },
      include: {
        author: { select: { displayName: true, avatarUrl: true } },
        categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    if (!post) throw new NotFoundError('Blog post');

    // Increment view count (fire and forget)
    prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    sendSuccess(reply, {
      ...post,
      categories: post.categories.map(c => c.category),
      tags: post.tags.map(t => t.tag),
    });
  });

  // GET /api/v1/blog/categories
  app.get('/categories', async (request, reply) => {
    const categories = await getCachedData('blog:categories', 300, () =>
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { posts: true } } },
      })
    );
    sendSuccess(reply, categories);
  });

  // GET /api/v1/blog/tags
  app.get('/tags', async (request, reply) => {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    sendSuccess(reply, tags);
  });
}

// ── Admin Blog Routes ──
export async function blogAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/admin/posts
  app.get('/', async (request, reply) => {
    const { page, pageSize, skip } = parsePagination(request.query as any);
    const status = (request.query as any).status;
    const search = (request.query as any).search;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) where.title = { contains: search };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
        include: {
          author: { select: { displayName: true } },
          categories: { select: { category: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    sendPaginated(reply, posts.map(p => ({
      ...p, categories: p.categories.map(c => c.category),
    })), total, page, pageSize);
  });

  // GET /api/v1/admin/posts/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true, category: { select: { name: true, slug: true } } } },
        tags: { select: { tagId: true, tag: { select: { name: true, slug: true } } } },
      },
    });
    if (!post) throw new NotFoundError('Post');
    sendSuccess(reply, {
      ...post,
      categories: post.categories.map(c => ({ id: c.categoryId, ...c.category })),
      tags: post.tags.map(t => ({ id: t.tagId, ...t.tag })),
    });
  });

  // POST /api/v1/admin/posts
  app.post('/', async (request, reply) => {
    const data = createPostSchema.parse(request.body);
    const postSlug = data.slug || slugify(data.title);
    const readingTime = calculateReadingTime(data.content);
    const cleanContent = sanitizeHtml(data.content);

    // Ensure unique slug
    let finalSlug = postSlug;
    let counter = 1;
    while (await prisma.blogPost.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${postSlug}-${counter++}`;
    }

    // Handle tags - create if not exist
    const tagRecords = [];
    for (const tagName of data.tagNames) {
      const tagSlug = slugify(tagName);
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        update: {},
        create: { name: tagName, slug: tagSlug },
      });
      tagRecords.push(tag);
    }

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: finalSlug,
        excerpt: data.excerpt || null,
        content: cleanContent,
        thumbnailUrl: data.thumbnailUrl || null,
        authorId: request.user!.userId,
        status: data.status,
        publishedAt: data.status === 'PUBLISHED' ? (data.publishedAt || new Date().toISOString()) : data.publishedAt || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        canonicalUrl: data.canonicalUrl || null,
        readingTimeMinutes: readingTime,
        categories: {
          create: data.categoryIds.map(categoryId => ({ categoryId })),
        },
        tags: {
          create: tagRecords.map(tag => ({ tagId: tag.id })),
        },
      },
    });

    await invalidateCache('blog:*');

    await prisma.adminActivityLog.create({
      data: {
        userId: request.user!.userId,
        action: 'post.create',
        entityType: 'BlogPost',
        entityId: post.id,
        ipAddress: getClientIP(request),
      },
    });

    sendSuccess(reply, post, 201);
  });

  // PUT /api/v1/admin/posts/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updatePostSchema.parse(request.body);

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Post');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined) {
      updateData.content = sanitizeHtml(data.content);
      updateData.readingTimeMinutes = calculateReadingTime(data.content);
    }
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'PUBLISHED' && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl;

    // Update categories if provided
    if (data.categoryIds !== undefined) {
      await prisma.postCategory.deleteMany({ where: { postId: id } });
      if (data.categoryIds.length > 0) {
        await prisma.postCategory.createMany({
          data: data.categoryIds.map(categoryId => ({ postId: id, categoryId })),
        });
      }
    }

    // Update tags if provided
    if (data.tagNames !== undefined) {
      await prisma.postTag.deleteMany({ where: { postId: id } });
      const tagRecords = [];
      for (const tagName of data.tagNames) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });
        tagRecords.push(tag);
      }
      if (tagRecords.length > 0) {
        await prisma.postTag.createMany({
          data: tagRecords.map(tag => ({ postId: id, tagId: tag.id })),
        });
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data: updateData });
    await invalidateCache('blog:*');

    sendSuccess(reply, post);
  });

  // DELETE /api/v1/admin/posts/:id (soft delete)
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
    await invalidateCache('blog:*');

    await prisma.adminActivityLog.create({
      data: {
        userId: request.user!.userId,
        action: 'post.delete',
        entityType: 'BlogPost',
        entityId: id,
        ipAddress: getClientIP(request),
      },
    });

    sendSuccess(reply, { message: 'Post deleted' });
  });

  // POST /api/v1/admin/posts/upload-image — upload blog thumbnail
  app.post('/upload-image', async (request, reply) => {
    const file = await request.file();
    if (!file) throw new ValidationError('No file uploaded');

    const mime = file.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
      throw new ValidationError('Only JPEG, PNG, WebP, and GIF images are allowed');
    }

    const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extMap[mime] || 'jpg';

    // Generate clean slugified filename from original name
    const rawName = file.filename.replace(/\.[^.]+$/, ''); // strip extension
    const slug = slugify(rawName) || `image-${Date.now()}`;
    const filename = `${slug}-${Date.now().toString(36)}.${ext}`;

    // Save to frontend/public/images/blog/
    const uploadDir = path.resolve(__dirname, '../../../../frontend/public/images/blog');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    await pipeline(file.file, createWriteStream(filePath));

    const siteUrl = env.CORS_ORIGIN.split(',')[0]?.trim() || 'http://localhost:7600';
    const imageUrl = `${siteUrl}/images/blog/${filename}`;

    sendSuccess(reply, { url: imageUrl, filename }, 201);
  });
}

// ── Admin Category Routes ──
export async function categoryAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { posts: true } }, parent: { select: { name: true } } },
    });
    sendSuccess(reply, categories);
  });

  app.post('/', async (request, reply) => {
    const data = createCategorySchema.parse(request.body);
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug || slugify(data.name),
        description: data.description || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder,
      },
    });
    await invalidateCache('blog:categories');
    sendSuccess(reply, category, 201);
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateCategorySchema.parse(request.body);
    const category = await prisma.category.update({ where: { id }, data: data as any });
    await invalidateCache('blog:categories');
    sendSuccess(reply, category);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cat = await prisma.category.findUnique({ where: { id } });
    if (cat?.isDefault) {
      return sendSuccess(reply, { error: 'Cannot delete the default category' }, 400 as any);
    }
    // Reassign posts to default
    const defaultCat = await prisma.category.findFirst({ where: { isDefault: true } });
    if (defaultCat) {
      const posts = await prisma.postCategory.findMany({ where: { categoryId: id } });
      for (const pc of posts) {
        await prisma.postCategory.upsert({
          where: { postId_categoryId: { postId: pc.postId, categoryId: defaultCat.id } },
          update: {},
          create: { postId: pc.postId, categoryId: defaultCat.id },
        });
      }
    }
    await prisma.postCategory.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });
    await invalidateCache('blog:categories');
    sendSuccess(reply, { message: 'Category deleted, posts reassigned to General' });
  });
}

// ── Admin Tag Routes ──
export async function tagAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request, reply) => {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    sendSuccess(reply, tags);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.postTag.deleteMany({ where: { tagId: id } });
    await prisma.tag.delete({ where: { id } });
    sendSuccess(reply, { message: 'Tag deleted' });
  });
}
