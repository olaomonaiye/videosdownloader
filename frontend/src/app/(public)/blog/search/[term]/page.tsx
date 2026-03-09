import { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Videos Downloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

async function searchPosts(term: string, page: number) {
  const params = new URLSearchParams({ pageSize: '12', page: String(page), search: term });
  const res = await fetch(
    `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/blog/posts?${params}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0, page: 1, pageSize: 12 } };
  return res.json();
}

export async function generateMetadata({ params }: { params: { term: string } }): Promise<Metadata> {
  const term = decodeURIComponent(params.term).replace(/-/g, ' ');
  return {
    title: `Search: ${term} - Blog`,
    description: `Blog posts related to "${term}" on ${SITE_NAME}. Find guides, tips, and tutorials.`,
    robots: { index: false, follow: true },
  };
}

export default async function BlogSearchPage({
  params,
  searchParams,
}: {
  params: { term: string };
  searchParams: { page?: string };
}) {
  const term = decodeURIComponent(params.term).replace(/-/g, ' ');
  const page = parseInt(searchParams.page || '1');
  const { data: posts, meta } = await searchPosts(term, page);

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: SITE_URL },
        { name: 'Blog', href: `${SITE_URL}/blog` },
        { name: `Search: ${term}`, href: `${SITE_URL}/blog/search/${params.term}` },
      ]} />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-slate-500">
              <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
              <li>/</li>
              <li><Link href="/blog" className="hover:text-brand-600">Blog</Link></li>
              <li>/</li>
              <li className="text-slate-900 dark:text-white font-medium">Search: {term}</li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Articles about &ldquo;{term}&rdquo;
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {meta.total > 0 ? `${meta.total} article${meta.total !== 1 ? 's' : ''} found` : 'No articles found'}
          </p>

          {/* Blog Cards Grid */}
          {posts.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post: any) => (
                <Link
                  key={post.slug}
                  href={`/${post.slug}`}
                  className="card group hover:border-brand-300 dark:hover:border-brand-700 overflow-hidden"
                >
                  {post.thumbnailUrl && (
                    <div className="aspect-video rounded-lg bg-slate-100 dark:bg-zinc-900 overflow-hidden mb-4 -mx-6 -mt-6">
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    {post.categories?.map((c: any) => (
                      <span key={c.slug} className="text-xs font-medium text-brand-600 dark:text-brand-400">{c.name}</span>
                    ))}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                    <span>VD Team</span>
                    <span>&middot;</span>
                    <span>{post.readingTimeMinutes || 3} min read</span>
                  </div>
                  <span className="mt-3 inline-block text-sm font-medium text-brand-600 dark:text-brand-400">
                    Read more &rarr;
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center py-16">
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No articles found matching &ldquo;{term}&rdquo;.
              </p>
              <Link href="/blog" className="btn-primary">Browse All Articles</Link>
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/blog/search/${params.term}?page=${p}`}
                  className={`px-4 py-2 text-sm rounded-lg border ${
                    p === meta.page
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
