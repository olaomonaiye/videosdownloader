import { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const catName = params.slug.charAt(0).toUpperCase() + params.slug.slice(1).replace(/-/g, ' ');
  return {
    title: `${catName} Articles`,
    description: `Browse ${catName.toLowerCase()} articles and guides on ${SITE_NAME}.`,
    alternates: { canonical: `${SITE_URL}/blog/category/${params.slug}` },
    openGraph: {
      title: `${catName} Articles - ${SITE_NAME}`,
      description: `Browse ${catName.toLowerCase()} articles and guides on ${SITE_NAME}.`,
      url: `${SITE_URL}/blog/category/${params.slug}`,
    },
  };
}

async function getPosts(category: string, page: number) {
  const params = new URLSearchParams({ pageSize: '12', page: String(page), category });
  const res = await fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/blog/posts?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0, page: 1, pageSize: 12 } };
  return res.json();
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { page?: string } }) {
  const { data: posts, meta } = await getPosts(params.slug, parseInt(searchParams.page || '1'));
  const catName = params.slug.charAt(0).toUpperCase() + params.slug.slice(1).replace(/-/g, ' ');

  return (
    <section className="py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{catName}</h1>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {(posts || []).map((post: any) => (
          <Link key={post.slug} href={`/${post.slug}`} className="card group hover:border-brand-300 dark:hover:border-brand-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 line-clamp-2">{post.title}</h2>
            {post.excerpt && <p className="mt-2 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>}
            <p className="mt-3 text-xs text-slate-400">{formatDate(post.publishedAt)} · {post.readingTimeMinutes} min</p>
          </Link>
        ))}
      </div>
      {posts?.length === 0 && <p className="text-center text-slate-500 py-16">No posts in this category yet.</p>}
    </div></section>
  );
}
