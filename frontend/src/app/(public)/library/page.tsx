import { Metadata } from 'next';
import Link from 'next/link';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600';

export const metadata: Metadata = {
  title: 'Library - All Platforms & Categories',
  description: `Browse all categories, platforms, and resources on ${SITE_NAME}.`,
  alternates: { canonical: `${SITE_URL}/library` },
  openGraph: {
    title: `Library - ${SITE_NAME}`,
    description: `Browse all categories, platforms, and resources on ${SITE_NAME}.`,
    url: `${SITE_URL}/library`,
  },
};

async function getData() {
  const [catRes, platRes] = await Promise.all([
    fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/blog/categories`, { next: { revalidate: 3600 } }),
    fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/platforms?pageSize=100`, { next: { revalidate: 3600 } }),
  ]);
  const categories = catRes.ok ? (await catRes.json()).data : [];
  const platforms = platRes.ok ? (await platRes.json()).data : [];
  return { categories, platforms };
}

export default async function LibraryPage() {
  const { categories, platforms } = await getData();

  return (
    <section className="py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Library</h1>
      <p className="mt-3 text-slate-500 dark:text-slate-400">Browse all categories and platforms</p>

      {/* Categories */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Blog Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(categories || []).map((c: any) => (
            <Link key={c.slug} href={`/blog/category/${c.slug}`} className="card hover:border-brand-300 dark:hover:border-brand-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{c._count?.posts || 0} articles</p>
              {c.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.description}</p>}
            </Link>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">All Platforms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {(platforms || []).map((p: any) => (
            <Link key={p.slug} href={`/${p.slug}-video-downloader`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="shrink-0">
                <PlatformIcon name={p.name} logoUrl={p.logoUrl} size="sm" />
              </div>
              <span className="truncate text-slate-700 dark:text-slate-300">{p.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div></section>
  );
}
