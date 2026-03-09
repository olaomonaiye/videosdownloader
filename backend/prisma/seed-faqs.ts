import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateFAQs(name: string, slug: string): Array<{ q: string; a: string }> {
  return [
    {
      q: `How do I download videos from ${name}?`,
      a: `Simply copy the ${name} video URL, paste it into the download field on our ${name} downloader page, click "Download", select your preferred format and quality, then click the download button next to it. The video will be saved to your device.`,
    },
    {
      q: `Is it free to download ${name} videos?`,
      a: `Yes, our ${name} video downloader is completely free to use. There are no hidden charges, premium tiers, or sign-up requirements. You can download unlimited videos from ${name} at no cost.`,
    },
    {
      q: `What formats can I download ${name} videos in?`,
      a: `Our ${name} downloader supports multiple formats including MP4, WebM, and audio-only formats like M4A and OGG. Available formats depend on what ${name} provides for each specific video.`,
    },
    {
      q: `Can I download ${name} videos in HD quality?`,
      a: `Yes! Our tool supports downloading ${name} videos in the highest available quality, including 720p, 1080p, 1440p, and even 4K when available. Select your preferred resolution from the format table after analyzing the URL.`,
    },
    {
      q: `Do I need to install any software to download ${name} videos?`,
      a: `No, our ${name} downloader works entirely in your web browser. There is nothing to install or configure. Just visit our website, paste the ${name} video URL, and download.`,
    },
    {
      q: `Can I extract audio from ${name} videos?`,
      a: `Yes, when you analyze a ${name} video URL, you will see audio-only format options alongside video formats. Select an audio format to download just the audio track without the video.`,
    },
    {
      q: `Is it safe to use the ${name} downloader?`,
      a: `Absolutely. Our service is safe and secure. We do not ask for any personal information, we do not store your downloaded files on our servers, and we use encrypted connections to protect your privacy.`,
    },
    {
      q: `Why is my ${name} download not working?`,
      a: `There are a few possible reasons: the video may be private or age-restricted, the URL may be incorrect, or the content may be geo-restricted in your region. Please double-check the URL and make sure the video is publicly accessible, then try again.`,
    },
  ];
}

async function main() {
  console.log('🔄 Generating FAQs for all platforms...');

  const platforms = await prisma.platform.findMany({
    select: { id: true, name: true, slug: true, faqJson: true },
  });

  console.log(`Found ${platforms.length} platforms`);

  let updated = 0;
  let skipped = 0;

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < platforms.length; i += batchSize) {
    const batch = platforms.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (platform) => {
        // Skip if FAQ already exists and has entries
        if (platform.faqJson && Array.isArray(platform.faqJson) && (platform.faqJson as any[]).length > 0) {
          skipped++;
          return;
        }

        const faqs = generateFAQs(platform.name, platform.slug);
        await prisma.platform.update({
          where: { id: platform.id },
          data: { faqJson: faqs as any },
        });
        updated++;
      })
    );
    console.log(`  Processed ${Math.min(i + batchSize, platforms.length)}/${platforms.length}...`);
  }

  console.log(`✅ Done! Updated: ${updated}, Skipped (already had FAQ): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
