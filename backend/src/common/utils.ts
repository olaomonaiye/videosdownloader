import * as crypto from 'crypto';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export function calculateReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getClientIP(request: { ip: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return request.ip;
}

export function parsePagination(query: { page?: string; pageSize?: string; limit?: string }, maxSize = 100): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize || query.limit || '20', 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function sanitizeHtml(html: string): string {
  // Basic sanitization — in production use DOMPurify with jsdom
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}
