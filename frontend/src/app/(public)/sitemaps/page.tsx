import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Globe, BookOpen, FolderOpen, Layout } from 'lucide-react';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600';

export const metadata: Metadata = {
  title: `Sitemaps - ${SITE_NAME}`,
  description: `All XML sitemaps for ${SITE_NAME}. Includes services, blog posts, categories, and static pages.`,
  alternates: { canonical: `${SITE_URL}/sitemaps` },
  robots: { index: true, follow: true },
};

const sitemaps = [
  {
    title: 'Sitemap Index',
    description: 'Master sitemap referencing all sub-sitemaps',
    href: '/sitemap-index.xml',
    icon: Globe,
  },
  {
    title: 'Services Sitemap',
    description: 'All supported platform downloader pages',
    href: '/services.xml',
    icon: FileText,
  },
  {
    title: 'Blog Sitemap',
    description: 'All published blog posts',
    href: '/blog.xml',
    icon: BookOpen,
  },
  {
    title: 'Categories Sitemap',
    description: 'All blog categories',
    href: '/categories.xml',
    icon: FolderOpen,
  },
  {
    title: 'Pages Sitemap',
    description: 'Static pages and core routes',
    href: '/pages.xml',
    icon: Layout,
  },
];

export default function SitemapsPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sitemaps</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          XML sitemaps for search engine indexing. These files help search engines discover and crawl all pages on {SITE_NAME}.
        </p>

        <div className="mt-10 space-y-4">
          {sitemaps.map(({ title, description, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                <code className="mt-2 block text-xs text-brand-600 dark:text-brand-400">{SITE_URL}{href}</code>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 rounded-xl bg-slate-50 dark:bg-zinc-900/50 p-5 border border-slate-200 dark:border-zinc-800">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">robots.txt</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Our <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">robots.txt</a> file
            references the sitemap index and defines crawling rules for search engines.
          </p>
        </div>
      </div>
    </section>
  );
}
