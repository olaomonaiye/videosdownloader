import { Metadata } from 'next';
import Link from 'next/link';
import { Download, Zap, Shield, Globe, Play, Music } from 'lucide-react';
import { DownloadForm } from '@/components/ui/DownloadForm';
import { PlatformRotator } from '@/components/ui/PlatformRotator';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { ScrollSection } from '@/components/ui/ScrollSection';
import { BlogThumbnail } from '@/components/ui/BlogThumbnail';
import { WebSiteSchema, SoftwareAppSchema } from '@/components/seo/JsonLd';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600';

export const metadata: Metadata = {
  title: `${SITE_NAME} - Download Videos from 1000+ Platforms Free`,
  description: `Free online video downloader. Download videos from YouTube, Instagram, TikTok, Facebook, Twitter and 1000+ more platforms with ${SITE_NAME}.`,
  alternates: { canonical: SITE_URL },
};

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Powered by enterprise-grade infrastructure for instant downloads.' },
  { icon: Shield, title: 'Safe & Secure', desc: 'No registration required. Your privacy is our priority.' },
  { icon: Globe, title: '1000+ Platforms', desc: 'Support for YouTube, Instagram, TikTok, Facebook, and many more.' },
  { icon: Play, title: 'Multiple Formats', desc: 'Download in MP4, WebM, MP3, and other formats at various quality levels.' },
  { icon: Download, title: 'Free Forever', desc: 'No hidden fees, no premium tiers. Completely free to use.' },
  { icon: Music, title: 'Audio Extraction', desc: 'Extract audio from any video in MP3 or other audio formats.' },
];

const topPlatformSlugs = [
  'youtube', 'instagram', 'tiktok', 'facebook',
  'twitter', 'vimeo', 'reddit', 'twitch',
  'dailymotion', 'pinterest', 'soundcloud', 'bilibili',
  'spotify', 'telegram', 'snapchat', 'linkedin',
];

const HOMEPAGE_PLATFORM_COUNT = 16;

async function getPlatformCount(): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/platforms/count`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return 1870;
    const data = await res.json();
    return data.data?.count || 1870;
  } catch {
    return 1870;
  }
}

async function getTopPlatforms(): Promise<Array<{ name: string; slug: string; logoUrl?: string }>> {
  try {
    const res = await fetch(
      `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/platforms?pageSize=500`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return topPlatformSlugs.slice(0, HOMEPAGE_PLATFORM_COUNT).map(s => ({ name: s, slug: s }));
    const data = await res.json();
    const all: Array<{ name: string; slug: string; logoUrl?: string }> = data.data || [];

    // First: prioritized top platforms in order
    const prioritized = topPlatformSlugs
      .map(s => all.find(p => p.slug === s))
      .filter(Boolean) as Array<{ name: string; slug: string; logoUrl?: string }>;

    // Then: other platforms that have icons, not already in prioritized
    const prioritizedSlugs = new Set(prioritized.map(p => p.slug));
    const withIcons = all.filter(p => p.logoUrl && !prioritizedSlugs.has(p.slug));

    const combined = [...prioritized, ...withIcons];
    return combined.slice(0, HOMEPAGE_PLATFORM_COUNT);
  } catch {
    return topPlatformSlugs.slice(0, HOMEPAGE_PLATFORM_COUNT).map(s => ({ name: s, slug: s }));
  }
}

async function getLatestPosts(): Promise<any[]> {
  try {
    const res = await fetch(
      `${process.env.API_URL_INTERNAL || 'http://localhost:7500'}/api/v1/blog/posts?pageSize=9&status=PUBLISHED`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [platformCount, latestPosts, topPlatforms] = await Promise.all([
    getPlatformCount(),
    getLatestPosts(),
    getTopPlatforms(),
  ]);

  return (
    <>
      <WebSiteSchema name={SITE_NAME} url={SITE_URL} />
      <SoftwareAppSchema name={SITE_NAME} url={SITE_URL} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-black dark:to-black py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Download Videos From{' '}
            <PlatformRotator />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400">
            Free, fast, and secure video downloader. No registration required. Just paste a URL and download.
          </p>
          <div className="mt-10">
            <DownloadForm placeholder="Paste any video URL here..." />
          </div>
          <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
            Free &bull; No Registration &bull; {platformCount.toLocaleString()}+ Platforms Supported
          </p>
        </div>
      </section>

      {/* How It Works */}
      <ScrollSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">How It Works</h2>
          <p className="text-center mt-3 text-slate-500 dark:text-slate-400">Three simple steps to download any video</p>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Paste URL', desc: 'Copy the video URL from any supported platform and paste it above.' },
              { step: '2', title: 'Select Format', desc: 'Choose your preferred video quality and format from the options.' },
              { step: '3', title: 'Download', desc: 'Click download and save the video to your device. Done!' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* Features Grid */}
      <ScrollSection className="py-16 sm:py-20 bg-slate-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">Features</h2>
          <p className="text-center mt-3 text-slate-500 dark:text-slate-400">Everything you need for hassle-free downloads</p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card">
                <f.icon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* Supported Platforms Showcase */}
      <ScrollSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">Supported Platforms</h2>
          <p className="text-center mt-3 text-slate-500 dark:text-slate-400">Download from all your favorite platforms</p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {topPlatforms.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}-video-downloader`}
                className="card flex items-center gap-3 hover:border-brand-300 dark:hover:border-brand-700"
              >
                <PlatformIcon name={p.name} logoUrl={p.logoUrl} size="lg" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">
              And {(platformCount - topPlatforms.length).toLocaleString()}+ more platforms &rarr;
            </Link>
          </div>
        </div>
      </ScrollSection>

      {/* Latest Blog Posts */}
      {latestPosts.length > 0 && (
        <ScrollSection className="py-16 sm:py-20 bg-slate-50 dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">Latest from Our Blog</h2>
            <p className="text-center mt-3 text-slate-500 dark:text-slate-400">Tips, guides, and the latest How To</p>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post: any) => (
                <Link key={post.slug} href={`/${post.slug}`} className="card group hover:border-brand-300 dark:hover:border-brand-700">
                  <div className="aspect-video rounded-lg bg-slate-100 dark:bg-zinc-900 overflow-hidden mb-4 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-800">
                    <BlogThumbnail src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">{post.title}</h3>
                  {post.excerpt && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>}
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/blog" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline text-sm">
                Read all articles &rarr;
              </Link>
            </div>
          </div>
        </ScrollSection>
      )}
    </>
  );
}
