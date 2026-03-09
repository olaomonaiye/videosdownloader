import { z } from 'zod';

// Helper: transform empty strings to null for optional nullable fields
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().url().nullable().optional()
);
const optionalStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().nullable().optional()
);

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  range: z.enum([
    'all', 'today', 'yesterday', 'last7days', 'thisWeek', 'lastWeek',
    'last28days', 'thisMonth', 'lastMonth', 'thisYear', 'custom',
  ]).default('all'),
});

export const downloadAnalyzeSchema = z.object({
  url: z.string().url().max(2048),
});

export const downloadInitiateSchema = z.object({
  url: z.string().url().max(2048),
  format: z.string().optional(),
  quality: z.string().optional(),
  title: z.string().max(500).optional(),
  needsMerge: z.boolean().optional(),
  type: z.enum(['video', 'audio']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createPostSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().min(1).max(500).optional()),
  excerpt: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().max(1000).nullable().optional()),
  content: z.string().min(1),
  thumbnailUrl: optionalUrl,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  publishedAt: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().datetime().nullable().optional()),
  metaTitle: optionalStr,
  metaDescription: optionalStr,
  canonicalUrl: optionalUrl,
  categoryIds: z.array(z.string().uuid()).default([]),
  tagNames: z.array(z.string()).default([]),
});

export const updatePostSchema = createPostSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().min(1).max(200).optional()),
  description: optionalStr,
  metaTitle: optionalStr,
  metaDescription: optionalStr,
  parentId: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().uuid().nullable().optional()),
  sortOrder: z.number().int().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createPageSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().min(1).max(500).optional()),
  content: z.string().min(1),
  metaTitle: optionalStr,
  metaDescription: optionalStr,
  ogImageUrl: optionalUrl,
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  showInFooter: z.boolean().default(false),
  showInHeader: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePageSchema = createPageSchema.partial();

export const updatePlatformSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().min(1).max(200).optional()),
  description: optionalStr,
  metaTitle: optionalStr,
  metaDescription: optionalStr,
  logoUrl: optionalUrl,
  faqJson: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  supportedFormats: z.any().optional().nullable(),
});

export const updateSettingsSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
  })
);
