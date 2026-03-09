import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DownloadForm } from '@/components/ui/DownloadForm';
import { FAQSchema, BreadcrumbSchema, SoftwareAppSchema, ArticleSchema } from '@/components/seo/JsonLd';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BlogThumbnail } from '@/components/ui/BlogThumbnail';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const DEFAULT_OG = `${SITE_URL || 'http://localhost:7600'}/images/og-default.svg`;
const API = process.env.API_URL_INTERNAL || 'http://localhost:7500';

function extractSlug(segments: string[]): string | null {
  const full = segments.join('/');
  const match = full.match(/^([a-z0-9-]+?)(?:-(?:video|audio))?-downloader$/);
  return match ? match[1] : null;
}

// Slugs that have their own route files and should NOT be handled by this catch-all
const RESERVED_SLUGS = new Set(['blog', 'services', 'library', 'sitemaps', 'admin', 'pages']);

function extractBlogSlug(segments: string[]): string | null {
  if (segments.length === 1 && /^[a-z0-9-]+$/.test(segments[0]) && !RESERVED_SLUGS.has(segments[0])) {
    return segments[0];
  }
  return null;
}

async function getBlogPost(slug: string) {
  try {
    const res = await fetch(`${API}/api/v1/blog/posts/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

async function getPlatform(slug: string) {
  const res = await fetch(`${API}/api/v1/platforms/${slug}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

async function getRelatedPlatforms(excludeSlug: string) {
  const res = await fetch(`${API}/api/v1/platforms?pageSize=50`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  const others = (data.data || []).filter((p: any) => p.slug !== excludeSlug);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, 6);
}

async function getRelatedPosts(platformName: string) {
  try {
    const params = new URLSearchParams({ pageSize: '6', search: platformName });
    const res = await fetch(`${API}/api/v1/blog/posts?${params}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const posts = data.data || [];
      if (posts.length > 0) return posts;
    }
    const fallback = await fetch(`${API}/api/v1/blog/posts?pageSize=6`, { next: { revalidate: 300 } });
    if (!fallback.ok) return [];
    const fbData = await fallback.json();
    return fbData.data || [];
  } catch {
    return [];
  }
}

async function getBlogRelatedPosts(currentSlug: string, categorySlug?: string) {
  try {
    const params = new URLSearchParams({ pageSize: '5' });
    if (categorySlug) params.set('category', categorySlug);
    const res = await fetch(`${API}/api/v1/blog/posts?${params}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).filter((p: any) => p.slug !== currentSlug).slice(0, 5);
  } catch {
    return [];
  }
}

async function getBlogCategories() {
  try {
    const res = await fetch(`${API}/api/v1/blog/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { serviceSlug: string[] } }): Promise<Metadata> {
  const slug = extractSlug(params.serviceSlug);
  if (slug) {
    const platform = await getPlatform(slug);
    if (!platform) return { title: 'Not Found' };
    return {
      title: platform.metaTitle || `Download ${platform.name} Videos Free | ${SITE_NAME}`,
      description: platform.metaDescription || `Download videos from ${platform.name} in HD quality. Free, fast, and no registration needed. ${SITE_NAME} supports ${platform.name} video and audio downloads.`,
      alternates: { canonical: `${SITE_URL}/${slug}-video-downloader` },
      openGraph: {
        title: `Download ${platform.name} Videos Free`,
        description: `Download videos from ${platform.name} in HD. Free, fast, and secure.`,
        url: `${SITE_URL}/${slug}-video-downloader`,
        type: 'website',
        siteName: SITE_NAME,
        images: [{ url: `${SITE_URL}/api/v1/og/${slug}`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Download ${platform.name} Videos Free`,
        description: `Download videos from ${platform.name} in HD. Free, fast, and secure.`,
      },
    };
  }

  // Blog post at root level
  const contentSlug = extractBlogSlug(params.serviceSlug);
  if (contentSlug) {
    const post = await getBlogPost(contentSlug);
    if (post) {
      const ogImage = post.thumbnailUrl || DEFAULT_OG;
      const canonicalUrl = post.canonicalUrl || `${SITE_URL}/${post.slug}`;
      return {
        title: post.metaTitle || `${post.title} | ${SITE_NAME}`,
        description: post.metaDescription || post.excerpt || `Read ${post.title} on ${SITE_NAME}`,
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
        openGraph: {
          title: post.metaTitle || post.title,
          description: post.metaDescription || post.excerpt || `Read ${post.title} on ${SITE_NAME}`,
          url: canonicalUrl,
          type: 'article',
          siteName: SITE_NAME,
          images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
          publishedTime: post.publishedAt,
          modifiedTime: post.updatedAt,
          authors: [post.author?.displayName || SITE_NAME],
        },
        twitter: {
          card: 'summary_large_image',
          title: post.metaTitle || post.title,
          description: post.metaDescription || post.excerpt || '',
          images: [ogImage],
        },
      };
    }
  }

  return { title: 'Not Found' };
}

export default async function ServicePage({ params }: { params: { serviceSlug: string[] } }) {
  const slug = extractSlug(params.serviceSlug);

  // Not a downloader URL — try blog post
  if (!slug) {
    const contentSlug = extractBlogSlug(params.serviceSlug);
    if (contentSlug) {
      const post = await getBlogPost(contentSlug);
      if (post) {
        const firstCat = post.categories?.[0];
        const [relatedPosts, categories] = await Promise.all([
          getBlogRelatedPosts(post.slug, firstCat?.slug),
          getBlogCategories(),
        ]);
        const ogImage = post.thumbnailUrl || DEFAULT_OG;

        return (
          <>
            <BreadcrumbSchema items={[
              { name: 'Home', href: SITE_URL },
              { name: 'Blog', href: `${SITE_URL}/blog` },
              { name: post.title, href: `${SITE_URL}/${post.slug}` },
            ]} />
            <ArticleSchema title={post.title} description={post.excerpt || ''} url={`${SITE_URL}/${post.slug}`}
              image={ogImage} datePublished={post.publishedAt} dateModified={post.updatedAt}
              authorName={post.author?.displayName || SITE_NAME} />

            <div className="py-8 sm:py-12">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <nav className="mb-6">
                  <ol className="flex items-center gap-2 text-sm text-slate-500">
                    <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
                    <li>/</li>
                    <li><Link href="/blog" className="hover:text-brand-600">Blog</Link></li>
                    <li>/</li>
                    <li className="text-slate-900 dark:text-white font-medium truncate max-w-[250px]">{post.title}</li>
                  </ol>
                </nav>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                  <article className="flex-1 min-w-0">
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 lg:p-10 shadow-sm">
                      {post.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.categories.map((c: any) => (
                            <Link key={c.slug} href={`/blog/category/${c.slug}`}
                              className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}

                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                        {post.title}
                      </h1>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        {post.author?.displayName && <span className="font-medium">{post.author.displayName}</span>}
                        <span>·</span>
                        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                        <span>·</span>
                        <span>{post.readingTimeMinutes} min read</span>
                      </div>

                      <div className="mt-6 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 shadow-md ring-1 ring-slate-200 dark:ring-zinc-800">
                        <BlogThumbnail src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
                      </div>

                      <div className="mt-8 prose dark:prose-invert prose-slate max-w-none prose-headings:font-bold prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-img:rounded-xl prose-pre:bg-slate-900 dark:prose-pre:bg-zinc-900"
                        dangerouslySetInnerHTML={{ __html: post.content }} />

                      {post.tags?.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-800">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((t: any) => (
                              <span key={t.slug} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>

                  <aside className="w-full lg:w-80 shrink-0 space-y-6">
                    {relatedPosts.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Related Posts</h3>
                        <div className="space-y-4">
                          {relatedPosts.map((p: any) => (
                            <Link key={p.slug} href={`/${p.slug}`} className="flex gap-3 group">
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-900 shrink-0 ring-1 ring-slate-200 dark:ring-zinc-800">
                                <BlogThumbnail src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug">
                                  {p.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-1">{formatDate(p.publishedAt)}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {categories.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Categories</h3>
                        <ul className="space-y-2">
                          {categories.map((c: any) => (
                            <li key={c.slug}>
                              <Link href={`/blog/category/${c.slug}`}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                                <span>{c.name}</span>
                                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                  {c._count?.posts || 0}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          </>
        );
      }
    }
    notFound();
  }

  const platform = await getPlatform(slug);
  if (!platform) notFound();

  const [related, relatedPosts] = await Promise.all([
    getRelatedPlatforms(slug),
    getRelatedPosts(platform.name),
  ]);
  const faqs: Array<{ q: string; a: string }> = Array.isArray(platform.faqJson) ? platform.faqJson : [];

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: SITE_URL },
        { name: 'Services', href: `${SITE_URL}/services` },
        { name: `${platform.name} Downloader`, href: `${SITE_URL}/${slug}-video-downloader` },
      ]} />
      <SoftwareAppSchema name={`${platform.name} Downloader - ${SITE_NAME}`} url={`${SITE_URL}/${slug}-video-downloader`} />
      {faqs.length > 0 && <FAQSchema faqs={faqs} />}

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/services" className="hover:text-brand-600">Services</Link></li>
          <li>/</li>
          <li className="text-slate-900 dark:text-white font-medium">{platform.name} Downloader</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="py-12 sm:py-16 bg-slate-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto mb-6">
            <PlatformIcon name={platform.name} logoUrl={platform.logoUrl} size="lg" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Download {platform.name} Videos Free
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {platform.description || `Download videos from ${platform.name} in HD quality. Fast, free, and no registration required.`}
          </p>
          <div className="mt-8">
            <DownloadForm platformSlug={slug} placeholder={`Paste ${platform.name} video URL here...`} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* FAQs */}
          {faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <details key={i} className="card group">
                    <summary className="cursor-pointer text-base font-semibold text-slate-900 dark:text-white list-none flex items-center justify-between">
                      {faq.q}
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Related Blog Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Related Articles</h2>
                <Link
                  href={`/blog/search/${encodeURIComponent(platform.name.toLowerCase())}`}
                  className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  View All &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedPosts.slice(0, 6).map((post: any) => (
                  <Link
                    key={post.slug}
                    href={`/${post.slug}`}
                    className="card group hover:border-brand-300 dark:hover:border-brand-700 overflow-hidden"
                  >
                    <div className="aspect-video rounded-lg bg-slate-100 dark:bg-zinc-900 overflow-hidden mb-3 -mx-6 -mt-6 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-800">
                      <BlogThumbnail
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{post.excerpt}</p>
                    )}
                    <span className="mt-2 inline-block text-xs font-medium text-brand-600 dark:text-brand-400">
                      Read more &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Downloaders */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Related Downloaders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((p: any) => (
                  <Link key={p.slug} href={`/${p.slug}-video-downloader`} className="card flex items-center gap-3 hover:border-brand-300 dark:hover:border-brand-700">
                    <div className="shrink-0">
                      <PlatformIcon name={p.name} logoUrl={p.logoUrl} size="sm" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{p.name} Downloader</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
