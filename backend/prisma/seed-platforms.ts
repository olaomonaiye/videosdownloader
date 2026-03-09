import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';

// ── Top ~50 popular platforms that should be isActive: true ──
const TOP_PLATFORMS = new Set([
  'youtube', 'instagram', 'tiktok', 'facebook', 'twitter',
  'vimeo', 'dailymotion', 'twitch', 'reddit', 'pinterest',
  'soundcloud', 'bandcamp', 'bilibili', 'rumble', 'linkedin',
  'snapchat', 'spotify', 'bbc', 'espn', 'cnn',
  'ted', 'flickr', 'tumblr', 'vk', 'weibo',
  'kick', 'loom', 'streamable', 'imgur', 'redgifs',
  '9gag', 'bitchute', 'niconico', 'naver', 'kakao',
  'odnoklassniki', 'rutube', 'vevo', 'mixcloud', 'audiomack',
  'patreon', 'nebula', 'curiositystream', 'dropout',
  'crunchyroll', 'funimation', 'disney', 'hotstar', 'peacock',
]);

// ── Display names & descriptions for top platforms ──
const PLATFORM_META: Record<string, { displayName: string; description: string; faq: { q: string; a: string }[] }> = {
  youtube: {
    displayName: 'YouTube',
    description: 'Download videos and audio from YouTube in various formats and quality levels. Supports playlists, shorts, and music.',
    faq: [
      { q: 'Can I download YouTube videos for free?', a: 'Yes! Our tool lets you download YouTube videos in multiple formats including MP4, WebM, and audio-only MP3 completely free.' },
      { q: 'What quality options are available?', a: 'We support all available qualities from 144p up to 4K (2160p) and even 8K where available.' },
      { q: 'Can I download YouTube Shorts?', a: 'Absolutely. Simply paste the YouTube Shorts URL and download it like any other video.' },
      { q: 'Is it possible to download only the audio?', a: 'Yes, you can extract audio in MP3, AAC, and other formats from any YouTube video.' },
      { q: 'Do I need to create an account?', a: 'No account or registration needed. Just paste the URL and download.' },
    ],
  },
  instagram: {
    displayName: 'Instagram',
    description: 'Download Instagram Reels, Stories, IGTV videos, and posts. Save Instagram content in high quality.',
    faq: [
      { q: 'Can I download Instagram Reels?', a: 'Yes, paste any Instagram Reel URL to download it in original quality.' },
      { q: 'What about Instagram Stories?', a: 'You can download public Instagram Stories by pasting the story URL.' },
      { q: 'Does it work with private accounts?', a: 'No, only publicly available content can be downloaded.' },
      { q: 'What formats are supported?', a: 'Instagram videos are typically available in MP4 format in their original quality.' },
      { q: 'Can I download carousel posts?', a: 'Yes, you can download individual images and videos from carousel posts.' },
    ],
  },
  tiktok: {
    displayName: 'TikTok',
    description: 'Download TikTok videos without watermark. Save TikTok content in HD quality for offline viewing.',
    faq: [
      { q: 'Can I download TikTok without watermark?', a: 'Our tool downloads TikTok videos in the best available quality. Watermark removal depends on availability.' },
      { q: 'What quality will I get?', a: 'Videos are downloaded in their original HD quality as uploaded by the creator.' },
      { q: 'Do I need a TikTok account?', a: 'No account needed. Just paste the video URL to download.' },
      { q: 'Can I download TikTok audio?', a: 'Yes, you can extract the audio track from any TikTok video.' },
      { q: 'Does it work with TikTok slideshows?', a: 'Yes, slideshow content can be downloaded as video.' },
    ],
  },
  facebook: {
    displayName: 'Facebook',
    description: 'Download Facebook videos including Reels, Watch videos, and public posts in HD quality.',
    faq: [
      { q: 'Can I download Facebook videos?', a: 'Yes, paste any public Facebook video URL to download it in HD.' },
      { q: 'What about Facebook Reels?', a: 'Facebook Reels can be downloaded just like regular videos.' },
      { q: 'Can I download private videos?', a: 'No, only publicly shared videos can be downloaded.' },
      { q: 'What formats are available?', a: 'Facebook videos are typically available in MP4 at various quality levels.' },
      { q: 'Does it work with Facebook Watch?', a: 'Yes, Facebook Watch videos are fully supported.' },
    ],
  },
  twitter: {
    displayName: 'Twitter / X',
    description: 'Download videos from Twitter/X posts. Save tweets with video content in MP4 format.',
    faq: [
      { q: 'How do I download Twitter videos?', a: 'Copy the tweet URL containing the video and paste it here to download.' },
      { q: 'What quality options are there?', a: 'Twitter videos are available in multiple resolutions from low to HD.' },
      { q: 'Can I download GIFs from Twitter?', a: 'Yes, Twitter GIFs are actually MP4 videos and can be downloaded.' },
      { q: 'Does it work with X (formerly Twitter)?', a: 'Yes, both twitter.com and x.com URLs are fully supported.' },
      { q: 'Can I download from Twitter Spaces?', a: 'Audio recordings from Twitter Spaces can be downloaded when available.' },
    ],
  },
  vimeo: {
    displayName: 'Vimeo',
    description: 'Download Vimeo videos in high quality. Support for public Vimeo content in various formats.',
    faq: [
      { q: 'Can I download all Vimeo videos?', a: 'Only publicly available Vimeo videos can be downloaded. Password-protected and private videos are not supported.' },
      { q: 'What quality is available?', a: 'Vimeo supports up to 4K quality depending on the original upload.' },
    ],
  },
  dailymotion: {
    displayName: 'Dailymotion',
    description: 'Download Dailymotion videos quickly and easily in multiple quality options.',
    faq: [
      { q: 'What quality can I download?', a: 'Dailymotion videos are available in multiple quality levels up to 1080p HD.' },
    ],
  },
  twitch: {
    displayName: 'Twitch',
    description: 'Download Twitch VODs, clips, and highlights. Save your favorite gaming content for offline viewing.',
    faq: [
      { q: 'Can I download Twitch VODs?', a: 'Yes, past broadcasts and VODs from Twitch can be downloaded.' },
      { q: 'What about Twitch clips?', a: 'Twitch clips can be downloaded by pasting the clip URL.' },
    ],
  },
  reddit: {
    displayName: 'Reddit',
    description: 'Download videos from Reddit posts. Supports v.redd.it hosted content in multiple quality levels.',
    faq: [
      { q: 'How do I download Reddit videos?', a: 'Copy the Reddit post URL with the video and paste it to download.' },
    ],
  },
  pinterest: {
    displayName: 'Pinterest',
    description: 'Download videos from Pinterest pins. Save creative and inspiring video content.',
    faq: [],
  },
  soundcloud: {
    displayName: 'SoundCloud',
    description: 'Download music and audio tracks from SoundCloud in high quality.',
    faq: [
      { q: 'Can I download any SoundCloud track?', a: 'Public tracks that allow downloads can be saved from SoundCloud.' },
    ],
  },
  bandcamp: {
    displayName: 'Bandcamp',
    description: 'Download music and album tracks from Bandcamp artists.',
    faq: [],
  },
  bilibili: {
    displayName: 'Bilibili',
    description: 'Download videos from Bilibili, one of the largest video platforms in Asia.',
    faq: [],
  },
  rumble: {
    displayName: 'Rumble',
    description: 'Download Rumble videos in various quality levels. Save free speech content offline.',
    faq: [],
  },
  linkedin: {
    displayName: 'LinkedIn',
    description: 'Download videos shared on LinkedIn posts for professional reference.',
    faq: [],
  },
  snapchat: {
    displayName: 'Snapchat',
    description: 'Download public Snapchat Spotlight and Stories content.',
    faq: [],
  },
  kick: {
    displayName: 'Kick',
    description: 'Download Kick livestream VODs and clips from your favorite streamers.',
    faq: [],
  },
  loom: {
    displayName: 'Loom',
    description: 'Download Loom screen recordings and video messages for offline viewing.',
    faq: [],
  },
  streamable: {
    displayName: 'Streamable',
    description: 'Download videos from Streamable in high quality MP4 format.',
    faq: [],
  },
  imgur: {
    displayName: 'Imgur',
    description: 'Download videos and GIFs from Imgur posts.',
    faq: [],
  },
  '9gag': {
    displayName: '9GAG',
    description: 'Download fun videos and GIFs from 9GAG posts.',
    faq: [],
  },
  bitchute: {
    displayName: 'BitChute',
    description: 'Download BitChute videos for offline viewing.',
    faq: [],
  },
  niconico: {
    displayName: 'Niconico',
    description: 'Download videos from Niconico, Japan\'s largest video sharing platform.',
    faq: [],
  },
  tumblr: {
    displayName: 'Tumblr',
    description: 'Download videos from Tumblr posts and blogs.',
    faq: [],
  },
  flickr: {
    displayName: 'Flickr',
    description: 'Download videos from Flickr photo and video sharing platform.',
    faq: [],
  },
  vk: {
    displayName: 'VK',
    description: 'Download videos from VK (VKontakte), the largest social network in Russia.',
    faq: [],
  },
  odnoklassniki: {
    displayName: 'Odnoklassniki',
    description: 'Download videos from OK.ru (Odnoklassniki) social network.',
    faq: [],
  },
  weibo: {
    displayName: 'Weibo',
    description: 'Download videos from Weibo, China\'s largest microblogging platform.',
    faq: [],
  },
  mixcloud: {
    displayName: 'Mixcloud',
    description: 'Download DJ mixes and radio shows from Mixcloud.',
    faq: [],
  },
  audiomack: {
    displayName: 'Audiomack',
    description: 'Download music and podcasts from Audiomack.',
    faq: [],
  },
  patreon: {
    displayName: 'Patreon',
    description: 'Download publicly available Patreon video content.',
    faq: [],
  },
  redgifs: {
    displayName: 'RedGifs',
    description: 'Download GIFs and short videos from RedGifs.',
    faq: [],
  },
  rutube: {
    displayName: 'Rutube',
    description: 'Download videos from Rutube, a Russian video hosting platform.',
    faq: [],
  },
  naver: {
    displayName: 'Naver',
    description: 'Download videos from Naver, South Korea\'s leading web portal.',
    faq: [],
  },
  kakao: {
    displayName: 'Kakao',
    description: 'Download videos from Kakao TV and KakaoTalk.',
    faq: [],
  },
  ted: {
    displayName: 'TED',
    description: 'Download inspiring TED Talks and presentations for offline viewing.',
    faq: [],
  },
  espn: {
    displayName: 'ESPN',
    description: 'Download ESPN sports highlights and video clips.',
    faq: [],
  },
  cnn: {
    displayName: 'CNN',
    description: 'Download news video clips from CNN.',
    faq: [],
  },
  bbc: {
    displayName: 'BBC',
    description: 'Download BBC news and entertainment video clips.',
    faq: [],
  },
  nebula: {
    displayName: 'Nebula',
    description: 'Download educational video content from Nebula creators.',
    faq: [],
  },
};

// ── Helper: Convert extractor name to URL-safe slug ──
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Helper: Convert extractor name to display name ──
function toDisplayName(extractor: string): string {
  // Check if we have a manual display name
  const slug = toSlug(extractor);
  if (PLATFORM_META[slug]?.displayName) {
    return PLATFORM_META[slug].displayName;
  }

  // Auto-generate: capitalize words, handle acronyms
  return extractor
    .replace(/([A-Z])/g, ' $1')   // camelCase → spaced
    .replace(/[._-]/g, ' ')        // separators → spaces
    .replace(/\s+/g, ' ')          // normalize spaces
    .trim()
    .split(' ')
    .map(w => {
      // Keep known acronyms uppercase
      if (['tv', 'fm', 'nba', 'nfl', 'bbc', 'cnn', 'espn', 'hbo', 'nhl', 'mlb', 'ted', 'vk', 'uk'].includes(w.toLowerCase())) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

async function main() {
  console.log('🌱 Seeding platforms from yt-dlp extractors...\n');

  // Step 1: Get all extractors from yt-dlp
  let extractorOutput: string;
  try {
    extractorOutput = execSync(`${YTDLP_PATH} --list-extractors`, {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env },
    });
  } catch (err: any) {
    console.error('❌ Failed to run yt-dlp --list-extractors:', err.message);
    process.exit(1);
  }

  const allExtractors = extractorOutput
    .split('\n')
    .map(line => line.replace(/\s*\(CURRENTLY BROKEN\)\s*$/i, '').trim())
    .filter(line => line.length > 0);

  console.log(`  📋 Total extractors from yt-dlp: ${allExtractors.length}`);

  // Step 2: Separate parent extractors (no colon) and sub-extractors (with colon)
  const parentExtractors = allExtractors.filter(e => !e.includes(':'));
  const subExtractors = allExtractors.filter(e => e.includes(':'));

  // Skip 'generic' extractor
  const filteredParents = parentExtractors.filter(e => e.toLowerCase() !== 'generic');

  console.log(`  📦 Parent extractors (will get service pages): ${filteredParents.length}`);
  console.log(`  📎 Sub-extractors (stored internally, no service pages): ${subExtractors.length}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Step 3: Upsert all parent extractors
  for (const extractor of filteredParents) {
    const slug = toSlug(extractor);
    if (!slug) continue;

    const isTop = TOP_PLATFORMS.has(slug);
    const meta = PLATFORM_META[slug];
    const displayName = toDisplayName(extractor);

    try {
      const existing = await prisma.platform.findUnique({ where: { slug } });

      if (existing && !existing.isAutoDiscovered) {
        // Don't overwrite manually edited platforms
        skipped++;
        continue;
      }

      await prisma.platform.upsert({
        where: { slug },
        update: {
          extractorKey: extractor,
          // Only update name/description if auto-discovered (don't overwrite manual edits)
          ...(existing?.isAutoDiscovered ? {
            name: displayName,
            ...(meta?.description ? { description: meta.description } : {}),
            ...(meta?.faq?.length ? { faqJson: meta.faq } : {}),
          } : {}),
        },
        create: {
          name: displayName,
          slug,
          extractorKey: extractor,
          description: meta?.description || `Download videos from ${displayName} for free in high quality.`,
          faqJson: meta?.faq?.length ? meta.faq : null,
          isActive: isTop,
          isAutoDiscovered: !meta, // Manual-quality platforms marked as not auto-discovered
          sortOrder: isTop ? 0 : 100,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    } catch (err: any) {
      console.error(`  ⚠️  Failed to upsert "${extractor}" (slug: ${slug}): ${err.message}`);
    }
  }

  // Step 4: Upsert sub-extractors (stored for internal matching, not active for public pages)
  for (const extractor of subExtractors) {
    const slug = toSlug(extractor);
    if (!slug) continue;

    try {
      const existing = await prisma.platform.findUnique({ where: { slug } });

      if (existing) {
        // Just update the extractor key if it exists
        await prisma.platform.update({
          where: { slug },
          data: { extractorKey: extractor },
        });
        updated++;
        continue;
      }

      // Get parent name for display
      const parentKey = extractor.split(':')[0];
      const parentDisplayName = toDisplayName(parentKey);
      const subType = extractor.split(':').slice(1).join(' ').replace(/[_-]/g, ' ');

      await prisma.platform.create({
        data: {
          name: `${parentDisplayName} (${subType})`,
          slug,
          extractorKey: extractor,
          description: null,
          isActive: false, // Sub-extractors never get public pages
          isAutoDiscovered: true,
          sortOrder: 999,
        },
      });
      created++;
    } catch (err: any) {
      // Likely a duplicate slug conflict — skip silently
      if (!err.message?.includes('Unique constraint')) {
        console.error(`  ⚠️  Failed to upsert sub-extractor "${extractor}": ${err.message}`);
      }
    }
  }

  // Step 5: Summary
  const totalInDb = await prisma.platform.count();
  const activeCount = await prisma.platform.count({ where: { isActive: true } });

  console.log(`\n  ✅ Created: ${created} new platforms`);
  console.log(`  🔄 Updated: ${updated} existing platforms`);
  console.log(`  ⏭️  Skipped: ${skipped} manually edited platforms`);
  console.log(`  📊 Total in database: ${totalInDb}`);
  console.log(`  🟢 Active (with public pages): ${activeCount}`);
  console.log('\n✅ Platform seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Platform seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
