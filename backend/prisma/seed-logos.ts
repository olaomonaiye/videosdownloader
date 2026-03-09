/**
 * Seed platform logo URLs for known popular platforms
 * Uses Simple Icons (simpleicons.org) CDN for SVG logos
 * Run: npx tsx prisma/seed-logos.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map platform slugs to Simple Icons slug names
// Simple Icons CDN: https://cdn.simpleicons.org/{icon-slug}/{color}
const PLATFORM_LOGOS: Record<string, string> = {
  // Major video platforms
  youtube: 'https://cdn.simpleicons.org/youtube/FF0000',
  'youtube:tab': 'https://cdn.simpleicons.org/youtube/FF0000',
  'youtube:playlist': 'https://cdn.simpleicons.org/youtube/FF0000',
  'youtube:shorts': 'https://cdn.simpleicons.org/youtubeshorts/FF0000',
  'youtube:music': 'https://cdn.simpleicons.org/youtubemusic/FF0000',
  youtubemusic: 'https://cdn.simpleicons.org/youtubemusic/FF0000',
  facebook: 'https://cdn.simpleicons.org/facebook/1877F2',
  'facebook:reel': 'https://cdn.simpleicons.org/facebook/1877F2',
  instagram: 'https://cdn.simpleicons.org/instagram/E4405F',
  'instagram:tagged': 'https://cdn.simpleicons.org/instagram/E4405F',
  tiktok: 'https://cdn.simpleicons.org/tiktok/000000',
  twitter: 'https://cdn.simpleicons.org/x/000000',
  'twitter:spaces': 'https://cdn.simpleicons.org/x/000000',
  vimeo: 'https://cdn.simpleicons.org/vimeo/1AB7EA',
  dailymotion: 'https://cdn.simpleicons.org/dailymotion/0D0D0D',
  twitch: 'https://cdn.simpleicons.org/twitch/9146FF',
  'twitch:vod': 'https://cdn.simpleicons.org/twitch/9146FF',
  'twitch:clips': 'https://cdn.simpleicons.org/twitch/9146FF',

  // Social media
  reddit: 'https://cdn.simpleicons.org/reddit/FF4500',
  'reddit:r': 'https://cdn.simpleicons.org/reddit/FF4500',
  pinterest: 'https://cdn.simpleicons.org/pinterest/BD081C',
  linkedin: 'https://cdn.simpleicons.org/linkedin/0A66C2',
  snapchat: 'https://cdn.simpleicons.org/snapchat/FFFC00',
  tumblr: 'https://cdn.simpleicons.org/tumblr/36465D',
  mastodon: 'https://cdn.simpleicons.org/mastodon/6364FF',
  threads: 'https://cdn.simpleicons.org/threads/000000',
  bluesky: 'https://cdn.simpleicons.org/bluesky/0285FF',

  // Music platforms
  soundcloud: 'https://cdn.simpleicons.org/soundcloud/FF3300',
  'soundcloud:playlist': 'https://cdn.simpleicons.org/soundcloud/FF3300',
  'soundcloud:set': 'https://cdn.simpleicons.org/soundcloud/FF3300',
  spotify: 'https://cdn.simpleicons.org/spotify/1DB954',
  bandcamp: 'https://cdn.simpleicons.org/bandcamp/629AA9',
  'bandcamp:album': 'https://cdn.simpleicons.org/bandcamp/629AA9',
  deezer: 'https://cdn.simpleicons.org/deezer/FEAA2D',
  'deezer:playlist': 'https://cdn.simpleicons.org/deezer/FEAA2D',
  'deezer:album': 'https://cdn.simpleicons.org/deezer/FEAA2D',
  mixcloud: 'https://cdn.simpleicons.org/mixcloud/5000FF',
  tidal: 'https://cdn.simpleicons.org/tidal/000000',
  amazonmusic: 'https://cdn.simpleicons.org/amazonmusic/FF9900',
  'apple:music': 'https://cdn.simpleicons.org/applemusic/FA243C',
  applemusic: 'https://cdn.simpleicons.org/applemusic/FA243C',
  audiomack: 'https://cdn.simpleicons.org/audiomack/FFA200',
  'lastfm': 'https://cdn.simpleicons.org/lastdotfm/D51007',
  'last.fm': 'https://cdn.simpleicons.org/lastdotfm/D51007',

  // Streaming / Video
  bilibili: 'https://cdn.simpleicons.org/bilibili/00A1D6',
  'bilibili:bangumi': 'https://cdn.simpleicons.org/bilibili/00A1D6',
  rumble: 'https://cdn.simpleicons.org/rumble/85C742',
  'rumble:channel': 'https://cdn.simpleicons.org/rumble/85C742',
  nebula: 'https://cdn.simpleicons.org/nebula/5765F2',
  crunchyroll: 'https://cdn.simpleicons.org/crunchyroll/F47521',
  odysee: 'https://cdn.simpleicons.org/odysee/EF1970',
  peertube: 'https://cdn.simpleicons.org/peertube/F1680D',
  bitchute: 'https://cdn.simpleicons.org/bitchute/EF4137',
  rutube: 'https://cdn.simpleicons.org/rutube/000000',
  '9gag': 'https://cdn.simpleicons.org/9gag/000000',
  wistia: 'https://cdn.simpleicons.org/wistia/54BBFF',
  plex: 'https://cdn.simpleicons.org/plex/EBAF00',
  roku: 'https://cdn.simpleicons.org/roku/662D91',

  // Image / GIF
  flickr: 'https://cdn.simpleicons.org/flickr/0063DC',
  imgur: 'https://cdn.simpleicons.org/imgur/1BB76E',
  giphy: 'https://cdn.simpleicons.org/giphy/FF6666',
  deviantart: 'https://cdn.simpleicons.org/deviantart/05CC47',

  // Tech / Dev
  github: 'https://cdn.simpleicons.org/github/181717',
  'github:gist': 'https://cdn.simpleicons.org/github/181717',
  bitbucket: 'https://cdn.simpleicons.org/bitbucket/0052CC',
  gitlab: 'https://cdn.simpleicons.org/gitlab/FC6D26',

  // Messaging
  telegram: 'https://cdn.simpleicons.org/telegram/26A5E4',
  discord: 'https://cdn.simpleicons.org/discord/5865F2',

  // Cloud / File hosting
  dropbox: 'https://cdn.simpleicons.org/dropbox/0061FF',
  'google:drive': 'https://cdn.simpleicons.org/googledrive/4285F4',
  googledrive: 'https://cdn.simpleicons.org/googledrive/4285F4',
  mediafire: 'https://cdn.simpleicons.org/mediafire/1299F3',
  mega: 'https://cdn.simpleicons.org/mega/D9272E',

  // TV Networks / Broadcasters
  bbc: 'https://cdn.simpleicons.org/bbc/000000',
  'bbc:iplayer': 'https://cdn.simpleicons.org/bbciplayer/FF4C98',
  cnn: 'https://cdn.simpleicons.org/cnn/CC0000',
  nbc: 'https://cdn.simpleicons.org/nbc/000000',
  pbs: 'https://cdn.simpleicons.org/pbs/396EB0',
  hulu: 'https://cdn.simpleicons.org/hulu/1CE783',
  'disney:plus': 'https://cdn.simpleicons.org/disneyplus/113CCF',
  disneyplus: 'https://cdn.simpleicons.org/disneyplus/113CCF',
  'hbo:max': 'https://cdn.simpleicons.org/hbo/000000',
  hbo: 'https://cdn.simpleicons.org/hbo/000000',
  'prime:video': 'https://cdn.simpleicons.org/primevideo/1A98FF',
  primevideo: 'https://cdn.simpleicons.org/primevideo/1A98FF',
  'apple:tv': 'https://cdn.simpleicons.org/appletv/000000',
  appletv: 'https://cdn.simpleicons.org/appletv/000000',
  peacock: 'https://cdn.simpleicons.org/peacock/000000',
  paramount: 'https://cdn.simpleicons.org/paramount/0064FF',
  'paramount:plus': 'https://cdn.simpleicons.org/paramountplus/0064FF',
  paramountplus: 'https://cdn.simpleicons.org/paramountplus/0064FF',
  espn: 'https://cdn.simpleicons.org/espn/FF0033',
  discovery: 'https://cdn.simpleicons.org/discovery/00A1E0',
  discoveryplus: 'https://cdn.simpleicons.org/discoveryplus/2175D9',
  nrk: 'https://cdn.simpleicons.org/nrk/26292A',
  zdf: 'https://cdn.simpleicons.org/zdf/FA7D19',
  ard: 'https://cdn.simpleicons.org/ard/004E94',
  rai: 'https://cdn.simpleicons.org/rai/003399',
  rtve: 'https://cdn.simpleicons.org/rtve/003399',
  itv: 'https://cdn.simpleicons.org/itv/02A88E',
  channel4: 'https://cdn.simpleicons.org/channel4/000000',
  'france:tv': 'https://cdn.simpleicons.org/francetélévisions/001E96',
  sky: 'https://cdn.simpleicons.org/sky/0072C9',

  // Education
  ted: 'https://cdn.simpleicons.org/ted/E62B1E',
  'ted:talk': 'https://cdn.simpleicons.org/ted/E62B1E',
  'ted:embed': 'https://cdn.simpleicons.org/ted/E62B1E',
  udemy: 'https://cdn.simpleicons.org/udemy/A435F0',
  coursera: 'https://cdn.simpleicons.org/coursera/0056D2',
  'khan:academy': 'https://cdn.simpleicons.org/khanacademy/14BF96',
  khanacademy: 'https://cdn.simpleicons.org/khanacademy/14BF96',
  skillshare: 'https://cdn.simpleicons.org/skillshare/00FF84',

  // Social / Regional
  vk: 'https://cdn.simpleicons.org/vk/0077FF',
  'vk:video': 'https://cdn.simpleicons.org/vk/0077FF',
  'vk:music': 'https://cdn.simpleicons.org/vk/0077FF',
  ok: 'https://cdn.simpleicons.org/odnoklassniki/EE8208',
  naver: 'https://cdn.simpleicons.org/naver/03C75A',
  weibo: 'https://cdn.simpleicons.org/sinaweibo/E6162D',
  niconico: 'https://cdn.simpleicons.org/niconico/231F20',
  'niconico:playlist': 'https://cdn.simpleicons.org/niconico/231F20',
  pixiv: 'https://cdn.simpleicons.org/pixiv/0096FA',
  'pixiv:sketch': 'https://cdn.simpleicons.org/pixiv/0096FA',
  'line:tv': 'https://cdn.simpleicons.org/line/00C300',
  line: 'https://cdn.simpleicons.org/line/00C300',
  kakao: 'https://cdn.simpleicons.org/kakaotalk/FFE812',
  kakaotv: 'https://cdn.simpleicons.org/kakaotalk/FFE812',

  // Misc popular
  imdb: 'https://cdn.simpleicons.org/imdb/F5C518',
  loom: 'https://cdn.simpleicons.org/loom/625DF5',
  trello: 'https://cdn.simpleicons.org/trello/0052CC',
  'apple:podcasts': 'https://cdn.simpleicons.org/applepodcasts/9933CC',
  'google:podcasts': 'https://cdn.simpleicons.org/googlepodcasts/4285F4',
  patreon: 'https://cdn.simpleicons.org/patreon/FF424D',
  kickstarter: 'https://cdn.simpleicons.org/kickstarter/05CE78',
  vevo: 'https://cdn.simpleicons.org/vevo/FF0000',
  pandora: 'https://cdn.simpleicons.org/pandora/3668FF',
  arte: 'https://cdn.simpleicons.org/arte/F47521',
  'arte:tv': 'https://cdn.simpleicons.org/arte/F47521',
  abc: 'https://cdn.simpleicons.org/abc/000000',
  cbc: 'https://cdn.simpleicons.org/cbc/FF2020',
  medium: 'https://cdn.simpleicons.org/medium/000000',
  substack: 'https://cdn.simpleicons.org/substack/FF6719',
  behance: 'https://cdn.simpleicons.org/behance/1769FF',
  dribbble: 'https://cdn.simpleicons.org/dribbble/EA4C89',
  'artstation': 'https://cdn.simpleicons.org/artstation/13AFF0',
  notion: 'https://cdn.simpleicons.org/notion/000000',
  'google:classroom': 'https://cdn.simpleicons.org/googleclassroom/0F9D58',
  zoom: 'https://cdn.simpleicons.org/zoom/0B5CFF',
  teamviewer: 'https://cdn.simpleicons.org/teamviewer/004680',
  steam: 'https://cdn.simpleicons.org/steam/000000',
  epicgames: 'https://cdn.simpleicons.org/epicgames/313131',
  playstation: 'https://cdn.simpleicons.org/playstation/003791',
  xbox: 'https://cdn.simpleicons.org/xbox/107C10',
  'nintendo:switch': 'https://cdn.simpleicons.org/nintendoswitch/E60012',
  itch: 'https://cdn.simpleicons.org/itchdotio/FA5C5C',
  gog: 'https://cdn.simpleicons.org/gogdotcom/86328A',
  twitch: 'https://cdn.simpleicons.org/twitch/9146FF',
  'iheart': 'https://cdn.simpleicons.org/iheartradio/C6002B',
  iheartradio: 'https://cdn.simpleicons.org/iheartradio/C6002B',
  anchor: 'https://cdn.simpleicons.org/anchor/5B21B6',
  podbean: 'https://cdn.simpleicons.org/podbean/8BBE64',
  overcast: 'https://cdn.simpleicons.org/overcast/FC7E0F',
  pocketcasts: 'https://cdn.simpleicons.org/pocketcasts/F43E37',
  acast: 'https://cdn.simpleicons.org/acast/27478A',
  castbox: 'https://cdn.simpleicons.org/castbox/F55B23',
  'amazon': 'https://cdn.simpleicons.org/amazon/FF9900',
  lazada: 'https://cdn.simpleicons.org/lazada/0F146D',
  shopee: 'https://cdn.simpleicons.org/shopee/EE4D2D',
  wordpress: 'https://cdn.simpleicons.org/wordpress/21759B',
  blogger: 'https://cdn.simpleicons.org/blogger/FF5722',
  wix: 'https://cdn.simpleicons.org/wix/0C6EFC',
  squarespace: 'https://cdn.simpleicons.org/squarespace/000000',
  webflow: 'https://cdn.simpleicons.org/webflow/146EF5',
};

async function seedLogos() {
  console.log('🎨 Seeding platform logos...\n');

  let updated = 0;
  let notFound = 0;

  for (const [slug, logoUrl] of Object.entries(PLATFORM_LOGOS)) {
    try {
      const result = await prisma.platform.updateMany({
        where: { slug, logoUrl: null },
        data: { logoUrl },
      });
      if (result.count > 0) {
        updated++;
        console.log(`  ✅ ${slug} → logo set`);
      }
    } catch {
      notFound++;
    }
  }

  // Also try partial slug matches for common patterns
  const PARTIAL_MATCHES: Array<{ contains: string; logoUrl: string }> = [
    { contains: 'youtube', logoUrl: 'https://cdn.simpleicons.org/youtube/FF0000' },
    { contains: 'facebook', logoUrl: 'https://cdn.simpleicons.org/facebook/1877F2' },
    { contains: 'instagram', logoUrl: 'https://cdn.simpleicons.org/instagram/E4405F' },
    { contains: 'tiktok', logoUrl: 'https://cdn.simpleicons.org/tiktok/000000' },
    { contains: 'twitter', logoUrl: 'https://cdn.simpleicons.org/x/000000' },
    { contains: 'twitch', logoUrl: 'https://cdn.simpleicons.org/twitch/9146FF' },
    { contains: 'reddit', logoUrl: 'https://cdn.simpleicons.org/reddit/FF4500' },
    { contains: 'soundcloud', logoUrl: 'https://cdn.simpleicons.org/soundcloud/FF3300' },
    { contains: 'spotify', logoUrl: 'https://cdn.simpleicons.org/spotify/1DB954' },
    { contains: 'vimeo', logoUrl: 'https://cdn.simpleicons.org/vimeo/1AB7EA' },
    { contains: 'bilibili', logoUrl: 'https://cdn.simpleicons.org/bilibili/00A1D6' },
    { contains: 'deezer', logoUrl: 'https://cdn.simpleicons.org/deezer/FEAA2D' },
    { contains: 'bandcamp', logoUrl: 'https://cdn.simpleicons.org/bandcamp/629AA9' },
    { contains: 'dailymotion', logoUrl: 'https://cdn.simpleicons.org/dailymotion/0D0D0D' },
    { contains: 'pinterest', logoUrl: 'https://cdn.simpleicons.org/pinterest/BD081C' },
    { contains: 'linkedin', logoUrl: 'https://cdn.simpleicons.org/linkedin/0A66C2' },
    { contains: 'tumblr', logoUrl: 'https://cdn.simpleicons.org/tumblr/36465D' },
    { contains: 'niconico', logoUrl: 'https://cdn.simpleicons.org/niconico/231F20' },
    { contains: 'telegram', logoUrl: 'https://cdn.simpleicons.org/telegram/26A5E4' },
    { contains: 'discord', logoUrl: 'https://cdn.simpleicons.org/discord/5865F2' },
    { contains: 'rumble', logoUrl: 'https://cdn.simpleicons.org/rumble/85C742' },
    { contains: 'pixiv', logoUrl: 'https://cdn.simpleicons.org/pixiv/0096FA' },
    { contains: 'mastodon', logoUrl: 'https://cdn.simpleicons.org/mastodon/6364FF' },
    { contains: 'peertube', logoUrl: 'https://cdn.simpleicons.org/peertube/F1680D' },
    { contains: 'flickr', logoUrl: 'https://cdn.simpleicons.org/flickr/0063DC' },
    { contains: 'imgur', logoUrl: 'https://cdn.simpleicons.org/imgur/1BB76E' },
    { contains: 'hulu', logoUrl: 'https://cdn.simpleicons.org/hulu/1CE783' },
    { contains: 'patreon', logoUrl: 'https://cdn.simpleicons.org/patreon/FF424D' },
    { contains: 'mega', logoUrl: 'https://cdn.simpleicons.org/mega/D9272E' },
    { contains: 'tidal', logoUrl: 'https://cdn.simpleicons.org/tidal/000000' },
    { contains: 'odysee', logoUrl: 'https://cdn.simpleicons.org/odysee/EF1970' },
    { contains: 'plex', logoUrl: 'https://cdn.simpleicons.org/plex/EBAF00' },
    { contains: 'roku', logoUrl: 'https://cdn.simpleicons.org/roku/662D91' },
    { contains: 'naver', logoUrl: 'https://cdn.simpleicons.org/naver/03C75A' },
    { contains: 'weibo', logoUrl: 'https://cdn.simpleicons.org/sinaweibo/E6162D' },
    { contains: 'espn', logoUrl: 'https://cdn.simpleicons.org/espn/FF0033' },
  ];

  for (const match of PARTIAL_MATCHES) {
    const result = await prisma.platform.updateMany({
      where: { slug: { contains: match.contains }, logoUrl: null },
      data: { logoUrl: match.logoUrl },
    });
    if (result.count > 0) {
      updated += result.count;
      console.log(`  ✅ *${match.contains}* → ${result.count} platforms matched`);
    }
  }

  console.log(`\n✅ Done! Updated ${updated} platforms with logos. ${notFound} not found in DB.`);
  await prisma.$disconnect();
}

seedLogos().catch(console.error);
