import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ServicesContent } from './ServicesContent';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export const metadata: Metadata = {
  title: `All Supported Platforms - Free Video Downloader`,
  description: `Browse all supported platforms by ${SITE_NAME}. Download videos from YouTube, Instagram, TikTok, and hundreds more.`,
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: `All Supported Platforms - ${SITE_NAME}`,
    description: `Browse all supported platforms by ${SITE_NAME}. Download videos from YouTube, Instagram, TikTok, and hundreds more.`,
    url: `${SITE_URL}/services`,
  },
};

async function getPlatforms(page: number, sort: string, order: string) {
  const params = new URLSearchParams({ pageSize: '48', page: String(page), sort, order });
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

export default async function ServicesPage() {
  const [{ data: platforms, meta }, totalCount] = await Promise.all([
    getPlatforms(1, 'name', 'asc'),
    getPlatformCount(),
  ]);

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: SITE_URL }, { name: 'Services', href: `${SITE_URL}/services` }]} />
      <ServicesContent initialPlatforms={platforms} initialMeta={meta} totalCount={totalCount} />
    </>
  );
}
