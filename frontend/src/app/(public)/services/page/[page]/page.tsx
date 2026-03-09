import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServicesContent } from '../../ServicesContent';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export async function generateMetadata({ params }: { params: { page: string } }): Promise<Metadata> {
  const page = parseInt(params.page, 10);
  return {
    title: `All Supported Platforms - Page ${page} | ${SITE_NAME}`,
    description: `Browse all supported platforms by ${SITE_NAME}. Page ${page}.`,
    alternates: { canonical: `${SITE_URL}/services/page/${page}` },
    robots: page > 1 ? { index: true, follow: true } : undefined,
  };
}

async function getPlatforms(page: number) {
  const params = new URLSearchParams({ pageSize: '48', page: String(page), sort: 'name', order: 'asc' });
  const res = await fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/platforms?${params}`, { next: { revalidate: 60 } });
  if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0, page: 1, pageSize: 48 } };
  return res.json();
}

async function getPlatformCount(): Promise<number> {
  try {
    const res = await fetch(`${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/platforms/count`, { next: { revalidate: 3600 } });
    if (!res.ok) return 1800;
    const data = await res.json();
    return data.data?.count || 1800;
  } catch { return 1800; }
}

export default async function ServicesPagePaginated({ params }: { params: { page: string } }) {
  const page = parseInt(params.page, 10);
  if (isNaN(page) || page < 1) notFound();
  if (page === 1) {
    const { redirect } = require('next/navigation');
    redirect('/services');
  }

  const [{ data: platforms, meta }, totalCount] = await Promise.all([
    getPlatforms(page),
    getPlatformCount(),
  ]);

  if (platforms.length === 0 && page > 1) notFound();

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: SITE_URL },
        { name: 'Services', href: `${SITE_URL}/services` },
        { name: `Page ${page}`, href: `${SITE_URL}/services/page/${page}` },
      ]} />
      <ServicesContent initialPlatforms={platforms} initialMeta={meta} totalCount={totalCount} initialPage={page} />
    </>
  );
}
