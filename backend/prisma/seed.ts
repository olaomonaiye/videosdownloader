import { PrismaClient, UserRole, SettingType, SitemapType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Create Super Admin ──
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
  const adminName = process.env.ADMIN_NAME || 'Super Admin';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        displayName: adminName,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`  ✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`  ⏭️  Admin user already exists: ${adminEmail}`);
  }

  // ── 2. Default Global Settings ──
  const siteName = process.env.SITE_NAME || 'VideoDownloader';
  const siteUrl = process.env.SITE_URL || 'http://localhost:7600';

  const defaultSettings = [
    // Branding
    { key: 'site_name', value: siteName, type: SettingType.STRING, group: 'branding', description: 'Platform brand name', isPublic: true },
    { key: 'site_url', value: siteUrl, type: SettingType.STRING, group: 'branding', description: 'Full canonical site URL', isPublic: true },
    { key: 'site_tagline', value: 'Download Any Video, Anywhere', type: SettingType.STRING, group: 'branding', description: 'Short tagline', isPublic: true },
    { key: 'site_description', value: 'Free online video downloader supporting 1000+ platforms. Download videos in HD quality from YouTube, Instagram, TikTok, Facebook, Twitter, and more.', type: SettingType.TEXT, group: 'branding', description: 'Site description for SEO', isPublic: true },
    { key: 'site_logo_light', value: '/images/logo.svg', type: SettingType.STRING, group: 'branding', description: 'Logo for light mode', isPublic: true },
    { key: 'site_logo_dark', value: '/images/logo-dark.svg', type: SettingType.STRING, group: 'branding', description: 'Logo for dark mode', isPublic: true },
    { key: 'site_favicon', value: '/images/favicon.ico', type: SettingType.STRING, group: 'branding', description: 'Favicon URL', isPublic: true },
    { key: 'site_og_image_default', value: '/images/og-default.png', type: SettingType.STRING, group: 'branding', description: 'Default OG image', isPublic: true },
    { key: 'footer_text', value: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`, type: SettingType.STRING, group: 'branding', description: 'Footer copyright text', isPublic: true },
    { key: 'contact_email', value: process.env.SITE_ADMIN_EMAIL || 'contact@example.com', type: SettingType.STRING, group: 'branding', description: 'Public contact email', isPublic: true },

    // SEO
    { key: 'meta_title_pattern', value: '{pageTitle} | {siteName}', type: SettingType.STRING, group: 'seo', description: 'Default page title pattern', isPublic: true },
    { key: 'robots_default', value: 'index, follow', type: SettingType.STRING, group: 'seo', description: 'Default robots directive', isPublic: false },

    // Analytics
    { key: 'google_analytics_id', value: process.env.GOOGLE_ANALYTICS_ID || '', type: SettingType.STRING, group: 'analytics', description: 'Google Analytics 4 ID', isPublic: true },
    { key: 'clarity_project_id', value: process.env.CLARITY_PROJECT_ID || '', type: SettingType.STRING, group: 'analytics', description: 'Microsoft Clarity project ID', isPublic: true },
    { key: 'custom_head_scripts', value: '', type: SettingType.TEXT, group: 'analytics', description: 'Custom scripts injected in <head>', isPublic: false },
    { key: 'custom_body_scripts', value: '', type: SettingType.TEXT, group: 'analytics', description: 'Custom scripts before </body>', isPublic: false },

    // Social
    { key: 'social_twitter', value: '', type: SettingType.STRING, group: 'social', description: 'Twitter/X handle', isPublic: true },
    { key: 'social_facebook', value: '', type: SettingType.STRING, group: 'social', description: 'Facebook page URL', isPublic: true },
    { key: 'social_github', value: '', type: SettingType.STRING, group: 'social', description: 'GitHub URL', isPublic: true },

    // Limits
    { key: 'rate_limit_per_minute', value: '30', type: SettingType.INTEGER, group: 'limits', description: 'Download rate limit per minute per IP', isPublic: false },
    { key: 'max_download_size_mb', value: '500', type: SettingType.INTEGER, group: 'limits', description: 'Max download file size in MB', isPublic: false },
    { key: 'maintenance_mode', value: 'false', type: SettingType.BOOLEAN, group: 'limits', description: 'Enable maintenance mode', isPublic: true },
  ];

  for (const setting of defaultSettings) {
    await prisma.globalSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`  ✅ ${defaultSettings.length} global settings seeded`);

  // ── 3. Default Category ──
  await prisma.category.upsert({
    where: { slug: 'general' },
    update: {},
    create: {
      name: 'General',
      slug: 'general',
      description: 'General articles and guides',
      isDefault: true,
      sortOrder: 0,
    },
  });
  console.log('  ✅ Default category "General" created');

  // ── 4. Initial Platforms ──
  const platforms = [
    { name: 'YouTube', slug: 'youtube', extractorKey: 'youtube', description: 'Download videos and audio from YouTube in various formats and quality levels. Supports playlists, shorts, and music.', faqJson: JSON.stringify([{ q: 'Can I download YouTube videos for free?', a: 'Yes! Our tool lets you download YouTube videos in multiple formats including MP4, WebM, and audio-only MP3 completely free.' }, { q: 'What quality options are available?', a: 'We support all available qualities from 144p up to 4K (2160p) and even 8K where available.' }, { q: 'Can I download YouTube Shorts?', a: 'Absolutely. Simply paste the YouTube Shorts URL and download it like any other video.' }, { q: 'Is it possible to download only the audio?', a: 'Yes, you can extract audio in MP3, AAC, and other formats from any YouTube video.' }, { q: 'Do I need to create an account?', a: 'No account or registration needed. Just paste the URL and download.' }]) },
    { name: 'Instagram', slug: 'instagram', extractorKey: 'instagram', description: 'Download Instagram Reels, Stories, IGTV videos, and posts. Save Instagram content in high quality.', faqJson: JSON.stringify([{ q: 'Can I download Instagram Reels?', a: 'Yes, paste any Instagram Reel URL to download it in original quality.' }, { q: 'What about Instagram Stories?', a: 'You can download public Instagram Stories by pasting the story URL.' }, { q: 'Does it work with private accounts?', a: 'No, only publicly available content can be downloaded.' }, { q: 'What formats are supported?', a: 'Instagram videos are typically available in MP4 format in their original quality.' }, { q: 'Can I download carousel posts?', a: 'Yes, you can download individual images and videos from carousel posts.' }]) },
    { name: 'TikTok', slug: 'tiktok', extractorKey: 'tiktok', description: 'Download TikTok videos without watermark. Save TikTok content in HD quality for offline viewing.', faqJson: JSON.stringify([{ q: 'Can I download TikTok without watermark?', a: 'Our tool downloads TikTok videos in the best available quality. Watermark removal depends on availability.' }, { q: 'What quality will I get?', a: 'Videos are downloaded in their original HD quality as uploaded by the creator.' }, { q: 'Do I need a TikTok account?', a: 'No account needed. Just paste the video URL to download.' }, { q: 'Can I download TikTok audio?', a: 'Yes, you can extract the audio track from any TikTok video.' }, { q: 'Does it work with TikTok slideshows?', a: 'Yes, slideshow content can be downloaded as video.' }]) },
    { name: 'Facebook', slug: 'facebook', extractorKey: 'facebook', description: 'Download Facebook videos including Reels, Watch videos, and public posts in HD quality.', faqJson: JSON.stringify([{ q: 'Can I download Facebook videos?', a: 'Yes, paste any public Facebook video URL to download it in HD.' }, { q: 'What about Facebook Reels?', a: 'Facebook Reels can be downloaded just like regular videos.' }, { q: 'Can I download private videos?', a: 'No, only publicly shared videos can be downloaded.' }, { q: 'What formats are available?', a: 'Facebook videos are typically available in MP4 at various quality levels.' }, { q: 'Does it work with Facebook Watch?', a: 'Yes, Facebook Watch videos are fully supported.' }]) },
    { name: 'Twitter / X', slug: 'twitter', extractorKey: 'twitter', description: 'Download videos from Twitter/X posts. Save tweets with video content in MP4 format.', faqJson: JSON.stringify([{ q: 'How do I download Twitter videos?', a: 'Copy the tweet URL containing the video and paste it here to download.' }, { q: 'What quality options are there?', a: 'Twitter videos are available in multiple resolutions from low to HD.' }, { q: 'Can I download GIFs from Twitter?', a: 'Yes, Twitter GIFs are actually MP4 videos and can be downloaded.' }, { q: 'Does it work with X (formerly Twitter)?', a: 'Yes, both twitter.com and x.com URLs are fully supported.' }, { q: 'Can I download from Twitter Spaces?', a: 'Audio recordings from Twitter Spaces can be downloaded when available.' }]) },
    { name: 'Vimeo', slug: 'vimeo', extractorKey: 'vimeo', description: 'Download Vimeo videos in high quality. Support for public Vimeo content in various formats.' },
    { name: 'Dailymotion', slug: 'dailymotion', extractorKey: 'dailymotion', description: 'Download Dailymotion videos quickly and easily in multiple quality options.' },
    { name: 'Twitch', slug: 'twitch', extractorKey: 'twitch', description: 'Download Twitch VODs, clips, and highlights. Save your favorite gaming content for offline viewing.' },
    { name: 'Reddit', slug: 'reddit', extractorKey: 'reddit', description: 'Download videos from Reddit posts. Supports v.redd.it hosted content in multiple quality levels.' },
    { name: 'Pinterest', slug: 'pinterest', extractorKey: 'pinterest', description: 'Download videos from Pinterest pins. Save creative and inspiring video content.' },
    { name: 'Snapchat', slug: 'snapchat', extractorKey: 'snapchat', description: 'Download public Snapchat Spotlight and Stories content.' },
    { name: 'LinkedIn', slug: 'linkedin', extractorKey: 'linkedin', description: 'Download videos shared on LinkedIn posts for professional reference.' },
    { name: 'SoundCloud', slug: 'soundcloud', extractorKey: 'soundcloud', description: 'Download music and audio tracks from SoundCloud in high quality.' },
    { name: 'Bandcamp', slug: 'bandcamp', extractorKey: 'bandcamp', description: 'Download music and album tracks from Bandcamp artists.' },
    { name: 'Bilibili', slug: 'bilibili', extractorKey: 'bilibili', description: 'Download videos from Bilibili, one of the largest video platforms in Asia.' },
    { name: 'Rumble', slug: 'rumble', extractorKey: 'rumble', description: 'Download Rumble videos in various quality levels. Save free speech content offline.' },
  ];

  for (const platform of platforms) {
    await prisma.platform.upsert({
      where: { slug: platform.slug },
      update: {},
      create: {
        ...platform,
        isActive: true,
        isAutoDiscovered: false,
        faqJson: platform.faqJson ? JSON.parse(platform.faqJson as string) : null,
      },
    });
  }
  console.log(`  ✅ ${platforms.length} platforms seeded`);

  // ── 5. Empty Sitemap Cache entries ──
  const sitemapTypes = [SitemapType.INDEX, SitemapType.PAGES, SitemapType.CATEGORIES, SitemapType.SERVICES, SitemapType.BLOG];
  for (const type of sitemapTypes) {
    await prisma.sitemapCache.upsert({
      where: { type },
      update: {},
      create: { type, content: '', triggerEvent: 'seed' },
    });
  }
  console.log('  ✅ Sitemap cache entries created');

  console.log('\n✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
