import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const API = process.env.API_URL_INTERNAL || 'http://localhost:7500';

async function getStaticPage(slug: string) {
  try {
    const res = await fetch(`${API}/api/v1/pages/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getStaticPage(params.slug);
  if (!page) return { title: 'Not Found' };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || `${page.title} - ${SITE_NAME}`,
    alternates: { canonical: `${SITE_URL}/pages/${params.slug}` },
  };
}

export default async function StaticPageRoute({ params }: { params: { slug: string } }) {
  const page = await getStaticPage(params.slug);
  if (!page) notFound();

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: SITE_URL },
        { name: page.title, href: `${SITE_URL}/pages/${params.slug}` },
      ]} />
      <article className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-slate-500">
              <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
              <li>/</li>
              <li className="text-slate-900 dark:text-white font-medium">{page.title}</li>
            </ol>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{page.title}</h1>
          <div
            className="mt-8 prose dark:prose-invert prose-slate max-w-none prose-headings:font-bold prose-a:text-brand-600"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </article>
    </>
  );
}
