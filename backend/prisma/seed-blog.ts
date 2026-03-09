/**
 * Seed sample blog posts for development
 * Run: npx tsx prisma/seed-blog.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const samplePosts = [
  {
    title: 'How to Download YouTube Videos in HD Quality',
    slug: 'how-to-download-youtube-videos-hd',
    excerpt: 'Learn the easiest way to download YouTube videos in 1080p, 4K, and other HD formats completely free.',
    content: `<h2>Why Download YouTube Videos?</h2><p>There are many reasons you might want to download YouTube videos — offline viewing during travel, saving tutorials for later reference, or archiving important content.</p><h2>Step-by-Step Guide</h2><p>Using our free video downloader, you can save any YouTube video in just three simple steps:</p><ol><li><strong>Copy the URL</strong> — Navigate to the YouTube video and copy its URL from the address bar.</li><li><strong>Paste and Analyze</strong> — Paste the URL into our download form. We'll automatically detect available formats.</li><li><strong>Choose Quality and Download</strong> — Select your preferred resolution (360p, 720p, 1080p, or 4K) and click download.</li></ol><h2>Supported Formats</h2><p>We support downloading in MP4, WebM, and audio-only formats like MP3 and M4A. Whether you need the full video or just the audio track, we've got you covered.</p><h2>Tips for Best Quality</h2><p>For the best experience, select the highest available resolution. Our system automatically merges video and audio streams for formats above 720p to ensure you get both crystal-clear video and audio.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=450&fit=crop',
    readingTimeMinutes: 3,
    categoryName: 'Tutorials',
    categorySlug: 'tutorials',
    tags: ['YouTube', 'HD', 'Download'],
  },
  {
    title: 'Top 10 Free Video Downloading Tips for 2026',
    slug: 'top-10-free-video-downloading-tips-2026',
    excerpt: 'Discover the best tips and tricks for downloading videos from social media platforms in 2026.',
    content: `<h2>The Ultimate Video Download Guide</h2><p>Downloading videos has never been easier. Here are our top 10 tips for getting the most out of free video downloaders in 2026.</p><h3>1. Always Check the Format</h3><p>Before downloading, check what formats are available. MP4 is the most universally compatible format.</p><h3>2. Choose the Right Resolution</h3><p>Higher resolution means larger files. For mobile viewing, 720p is usually sufficient. For TV or desktop, go for 1080p or higher.</p><h3>3. Extract Audio When You Only Need Sound</h3><p>If you only need the audio from a music video or podcast, download in MP3 format to save space.</p><h3>4. Use a Reliable Downloader</h3><p>Not all downloaders are created equal. Choose one that supports multiple platforms and doesn't require registration.</p><h3>5. Check Your Storage Space</h3><p>4K videos can be several gigabytes. Make sure you have enough storage before downloading large files.</p><h3>6. Download Over Wi-Fi</h3><p>Large downloads can eat through mobile data quickly. Connect to Wi-Fi whenever possible.</p><h3>7. Batch Download Playlists</h3><p>Many downloaders support playlist downloads, saving you time when you need multiple videos.</p><h3>8. Keep Videos Organized</h3><p>Create folders for different categories — music videos, tutorials, podcasts — to keep your downloads organized.</p><h3>9. Respect Copyright</h3><p>Only download content you have the right to save. Many creators rely on views for income.</p><h3>10. Stay Updated</h3><p>Platform APIs change frequently. Use a downloader that stays up-to-date with the latest changes.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&h=450&fit=crop',
    readingTimeMinutes: 5,
    categoryName: 'Tips & Tricks',
    categorySlug: 'tips-and-tricks',
    tags: ['Tips', 'Guide', '2026'],
  },
  {
    title: 'Instagram Reels vs TikTok: Download Guide for Both',
    slug: 'instagram-reels-vs-tiktok-download-guide',
    excerpt: 'A comprehensive comparison of downloading from Instagram Reels and TikTok, with step-by-step instructions.',
    content: `<h2>Short-Form Video is King</h2><p>Instagram Reels and TikTok dominate short-form video content. Here's how to download from both platforms.</p><h2>Downloading Instagram Reels</h2><p>To download an Instagram Reel:</p><ol><li>Open the Reel and tap the three dots menu</li><li>Select "Copy Link"</li><li>Paste the link into our downloader</li><li>Select your preferred quality and download</li></ol><h2>Downloading TikTok Videos</h2><p>For TikTok videos:</p><ol><li>Tap "Share" on the video</li><li>Select "Copy Link"</li><li>Paste into our download form</li><li>Choose format and download</li></ol><h2>Key Differences</h2><p>Instagram Reels typically offer higher base quality, while TikTok videos often include watermarks. Our downloader handles both seamlessly, providing clean downloads in the best available quality.</p><h2>Audio-Only Downloads</h2><p>Both platforms are popular for music content. You can extract just the audio in MP3 format from either platform using our tool.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&h=450&fit=crop',
    readingTimeMinutes: 4,
    categoryName: 'Tutorials',
    categorySlug: 'tutorials',
    tags: ['Instagram', 'TikTok', 'Reels'],
  },
  {
    title: 'How to Download Facebook Videos Without Registration',
    slug: 'download-facebook-videos-without-registration',
    excerpt: 'Save Facebook videos to your device for free without creating an account or installing software.',
    content: `<h2>Facebook Video Downloads Made Simple</h2><p>Facebook hosts billions of videos, from personal memories to viral content. Here's how to save them offline without any registration.</p><h2>Step-by-Step Process</h2><ol><li><strong>Find the Video</strong> — Browse Facebook and find the video you want to save.</li><li><strong>Get the URL</strong> — Click the three dots on the video post and select "Copy link" or copy from the browser address bar.</li><li><strong>Paste and Download</strong> — Paste the URL into our downloader. We support both public and shared videos.</li></ol><h2>What About Private Videos?</h2><p>Our tool can only download publicly accessible videos. For privacy reasons, private or friends-only videos cannot be accessed by external tools.</p><h2>Quality Options</h2><p>Facebook videos are typically available in SD (360p) and HD (720p) quality. Select the one that best suits your needs.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop',
    readingTimeMinutes: 3,
    categoryName: 'Tutorials',
    categorySlug: 'tutorials',
    tags: ['Facebook', 'Free', 'No Registration'],
  },
  {
    title: 'Best Video Formats Explained: MP4, WebM, MKV',
    slug: 'best-video-formats-explained-mp4-webm-mkv',
    excerpt: 'Understanding video formats helps you make better download choices. Learn the differences between MP4, WebM, and MKV.',
    content: `<h2>Video Format Basics</h2><p>When downloading videos, you'll encounter different formats. Understanding them helps you choose the right one for your needs.</p><h2>MP4 (MPEG-4)</h2><p>The most widely supported format. Works on virtually every device — phones, tablets, computers, smart TVs. If you're unsure which format to choose, MP4 is always a safe bet.</p><h2>WebM</h2><p>Developed by Google, WebM offers excellent quality at smaller file sizes. It's the default format on YouTube and works great in web browsers, but may not be supported by all media players.</p><h2>MKV (Matroska)</h2><p>A flexible container format that can hold multiple audio tracks and subtitles. Popular for high-quality video archiving. Requires VLC or a similar media player.</p><h2>Audio Formats</h2><p><strong>MP3</strong> — Universal audio format, great for music. <strong>M4A</strong> — Better quality than MP3 at the same file size. <strong>OGG</strong> — Open-source alternative with good quality.</p><h2>Our Recommendation</h2><p>For most users, we recommend MP4 for video and MP3 for audio. They offer the best balance of quality, compatibility, and file size.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800&h=450&fit=crop',
    readingTimeMinutes: 4,
    categoryName: 'Tips & Tricks',
    categorySlug: 'tips-and-tricks',
    tags: ['Formats', 'MP4', 'WebM'],
  },
  {
    title: 'Twitter Video Downloads: Save Tweets with Media',
    slug: 'twitter-video-downloads-save-tweets-media',
    excerpt: 'Learn how to download videos from Twitter (X) posts, including GIFs and embedded media.',
    content: `<h2>Downloading from Twitter/X</h2><p>Twitter (now X) is a major source of viral videos, news clips, and entertaining content. Here's how to save them.</p><h2>How to Get the Video URL</h2><ol><li>Find the tweet with the video</li><li>Click the share button (arrow icon)</li><li>Select "Copy link to post"</li><li>Paste into our downloader</li></ol><h2>GIF Downloads</h2><p>Twitter converts uploaded GIFs to MP4 videos. When you download a "GIF" from Twitter, you'll get an MP4 file. This is actually better quality and smaller file size than a real GIF.</p><h2>Quality Considerations</h2><p>Twitter compresses uploaded videos. The maximum quality available depends on what the original uploader shared. Our tool always provides the highest quality version available.</p><h2>Spaces Audio</h2><p>You can also download audio from Twitter Spaces recordings using the same process — just paste the Space URL.</p>`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=450&fit=crop',
    readingTimeMinutes: 3,
    categoryName: 'Tutorials',
    categorySlug: 'tutorials',
    tags: ['Twitter', 'X', 'GIF'],
  },
];

async function seedBlog() {
  console.log('📝 Seeding blog posts...\n');

  // Get admin user
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    console.log('❌ No admin user found. Run seed.ts first.');
    return;
  }

  let created = 0;

  for (const post of samplePosts) {
    // Check if already exists
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      console.log(`  ⏭️  ${post.slug} already exists`);
      continue;
    }

    // Create or find category
    let category = await prisma.category.findUnique({ where: { slug: post.categorySlug } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: post.categoryName, slug: post.categorySlug },
      });
      console.log(`  📁 Created category: ${post.categoryName}`);
    }

    // Create tags
    const tagIds: string[] = [];
    for (const tagName of post.tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
      if (!tag) {
        tag = await prisma.tag.create({ data: { name: tagName, slug: tagSlug } });
      }
      tagIds.push(tag.id);
    }

    // Create post
    const blogPost = await prisma.blogPost.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        thumbnailUrl: post.thumbnailUrl,
        readingTimeMinutes: post.readingTimeMinutes,
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - created * 86400000), // Stagger dates
        authorId: admin.id,
        categories: {
          create: [{ categoryId: category.id }],
        },
        tags: {
          create: tagIds.map(tagId => ({ tagId })),
        },
      },
    });

    created++;
    console.log(`  ✅ ${post.title}`);
  }

  console.log(`\n✅ Done! Created ${created} blog posts.`);
  await prisma.$disconnect();
}

seedBlog().catch(console.error);
