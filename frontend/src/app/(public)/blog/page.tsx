import { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { BlogThumbnail } from '@/components/ui/BlogThumbnail';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600';

export const metadata: Metadata = {
  title: `Blog - Video Download Tips & Guides`,
  description: `Tips, guides, and news about video downloading. Read the latest from ${SITE_NAME}.`,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: `Blog - ${SITE_NAME}`,
    description: `Tips, guides, and news about video downloading. Read the latest from ${SITE_NAME}.`,
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
};

async function getPosts(page?: number, category?: string) {
  const params = new URLSearchParams({ pageSize: '12', page: String(page || 1) });
  if (category) params.set('category', category);
  const res = await fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/blog/posts?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0, page: 1, pageSize: 12 } };
  return res.json();
}

export default async function BlogPage({ searchParams }: { searchParams: { page?: string; category?: string } }) {
  const { data: posts, meta } = await getPosts(parseInt(searchParams.page || '1'), searchParams.category);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Blog</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">Tips, guides, and the latest How To</p>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(posts || []).map((post: any) => (
            <Link key={post.slug} href={`/${post.slug}`} className="card group hover:border-brand-300 dark:hover:border-brand-700">
              <div className="aspect-video rounded-lg bg-slate-100 dark:bg-zinc-900 overflow-hidden mb-4 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-800">
                <BlogThumbnail src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="flex gap-2 mb-2">
                {post.categories?.map((c: any) => (
                  <span key={c.slug} className="text-xs font-medium text-brand-600 dark:text-brand-400">{c.name}</span>
                ))}
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">{post.title}</h2>
              {post.excerpt && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>}
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span>{post.author?.displayName}</span>
                <span>·</span>
                <span>{formatDate(post.publishedAt)}</span>
                <span>·</span>
                <span>{post.readingTimeMinutes} min read</span>
              </div>
            </Link>
          ))}
        </div>
        {posts?.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400 py-16">No blog posts yet. Check back soon!</p>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={`/blog?page=${p}`} className={`px-4 py-2 text-sm rounded-lg border ${p === meta.page ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}>{p}</Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
