# PRODUCT REQUIREMENTS DOCUMENT (PRD) — v3.0 PATCH & ENHANCEMENT

## Enterprise SEO-Driven Multi-Platform Video Downloader

**Document Version:** 3.0 (Patch & Enhancement)
**Date:** March 2026
**Purpose:** This PRD is NOT a rebuild. It is a **patch, fix, and enhancement document** for the existing codebase already deployed on ports 7500 (API) and 7600 (Frontend). Every section describes specific fixes, enhancements, and new implementations to be applied incrementally to the existing project.

---

> **⚠️ CRITICAL RULES FOR ALL DEVELOPMENT:**
>
> 1. **NEVER expose "yt-dlp" to end users.** The term "yt-dlp" must NEVER appear in any user-facing UI, HTML source, meta tags, error messages, or client-side JavaScript. It is an internal engine only. Publicly, describe capabilities as "our download engine" or "our technology."
> 2. **All brand references are dynamic.** The platform name, URL, tagline, and logo come from Admin Global Settings and `.env` / `.env.local` files. Nothing is hardcoded.
> 3. **No download counts on any user-facing page.** Download counts are admin-only metrics. Remove from service pages, platform listings, homepage, and library pages.
> 4. **The platform must be fully responsive** — mobile-first, tablet, and desktop — on ALL pages including the admin panel.
> 5. **Dark mode must be TRUE dark mode** — pure dark backgrounds (`#0F172A` / `#020617`), NOT blue-tinted backgrounds. Blue is accent only.

---

## BUILD ORDER — PRIORITY SECTIONS

This PRD is sectioned so an AI can build it incrementally, section by section, without overwhelm. **Build in this exact order:**

| Priority | Section | Description |
|----------|---------|-------------|
| **P0** | Section 1 | yt-dlp Correct Installation & Verification |
| **P0** | Section 2 | Platform Seeding from Official Source |
| **P1** | Section 3 | Fix Dark/Light Mode (True Dark Mode) |
| **P1** | Section 4 | Homepage Redesign (Hero + Rotator + Sections + Scroll Animations) |
| **P1** | Section 5 | Fix Download Flow (Real Preview + Direct Download) |
| **P2** | Section 6 | Global Navigation Search (Instant Platform Search) |
| **P2** | Section 7 | Platforms Listing Page (Pagination + Sort + Instant Search) |
| **P3** | Section 8 | Full Responsive Fix (Public + Admin) |
| **P3** | Section 9 | Admin Panel Fixes (Mobile Nav, Charts, TipTap Editor) |
| **P4** | Section 10 | SEO Optimization (Structured Data, Meta, Sitemaps) |
| **P4** | Section 11 | Service/Downloader Page Polish |
| **P5** | Section 12 | Final Cleanup & QA Checklist |

---

## Section 1: yt-dlp Correct Installation & Verification (P0)

### 1.1 Problem

The current yt-dlp integration is not working. Downloads fail, analysis returns empty results, or the process cannot spawn yt-dlp. This must be fixed FIRST before anything else.

### 1.2 Installation Steps (Server-Side — Run on VPS/Server)

Execute these commands on the production server where the backend runs:

```bash
# Step 1: Install Python 3 and pip (if not already present)
sudo apt update && sudo apt install -y python3 python3-pip

# Step 2: Install yt-dlp with all default dependencies via pip
python3 -m pip install -U "yt-dlp[default]"

# Step 3: Install ffmpeg (REQUIRED for format merging and conversion)
sudo apt install -y ffmpeg

# Step 4: Verify installation
yt-dlp --version
# Expected output: 2025.xx.xx or newer

ffmpeg -version
# Should show ffmpeg version info

# Step 5: Verify yt-dlp can actually download
yt-dlp --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ" | head -5
# Should output JSON metadata

# Step 6: List all supported extractors (we will use this for seeding)
yt-dlp --list-extractors | wc -l
# Should show 1800+ extractors

# Step 7: Make yt-dlp globally accessible
which yt-dlp
# Should show a path like /usr/local/bin/yt-dlp or ~/.local/bin/yt-dlp
# If it shows ~/.local/bin/yt-dlp, add to PATH:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 1.3 Environment Variable Verification

Ensure `.env` at project root contains:

```env
YTDLP_PATH="yt-dlp"
# OR the full path from `which yt-dlp`, e.g.:
# YTDLP_PATH="/usr/local/bin/yt-dlp"
YTDLP_TIMEOUT=120000
YTDLP_AUTO_UPDATE=true
YTDLP_UPDATE_CRON="0 3 * * *"
```

### 1.4 Backend Worker Fix

The download worker (`backend/src/workers/download-worker.ts`) must:

- Use `child_process.spawn` with the correct yt-dlp path from `process.env.YTDLP_PATH`
- Pass `--no-check-certificates` flag if running behind proxy
- Always include `--no-playlist` for single video analysis
- Use `--dump-json` for metadata extraction (NOT `--get-title` or similar)
- Use `-f` flag for format selection during actual download
- Ensure `PATH` environment variable is inherited by child process: `spawn(ytdlpPath, args, { env: { ...process.env } })`

### 1.5 Health Check Must Verify yt-dlp

The `/api/v1/health` endpoint must run `yt-dlp --version` and report:
- `ytdlp.status`: "available" or "unavailable"
- `ytdlp.version`: The version string
- `ffmpeg.status`: "available" or "unavailable"

---

## Section 2: Platform Seeding from Official Source (P0)

### 2.1 Problem

The current database only has ~16 manually seeded platforms. The platform supports **1,800+ sites** and we must seed ALL of them from the official yt-dlp supported sites list.

### 2.2 Seeding Source

The canonical source of all supported platforms is:
**https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md**

This file contains every extractor included with yt-dlp. The seeding script must:

1. **Method A (Recommended):** Run `yt-dlp --list-extractors` on the server and parse ALL output lines as extractor keys
2. **Method B (Fallback):** Fetch the raw supportedsites.md from `https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/supportedsites.md` and parse all `**name**` entries

### 2.3 Seeding Script Logic

Create or update `backend/prisma/seed-platforms.ts`:

```typescript
// Pseudocode for the seeding script:

// 1. Run: yt-dlp --list-extractors
// 2. Parse each line as an extractor name
// 3. For each extractor:
//    a. Create a slug: lowercase, replace non-alphanumeric with hyphens
//    b. Create a display name: clean up the extractor name
//    c. Skip extractors that are:
//       - "generic" (the fallback extractor)
//       - Sub-extractors (containing ":" like "youtube:playlist")
//         UNLESS they are major sub-types we want pages for
//    d. Upsert into the Platforms table with:
//       - name: Display-friendly name
//       - slug: URL-safe slug
//       - extractorKey: Original extractor name
//       - isActive: true for top 50 popular platforms, false for others
//       - isAutoDiscovered: true
//    e. DO NOT overwrite manually edited platforms (check isAutoDiscovered)

// 4. For the top ~50 most popular platforms, set isActive: true
//    These include: YouTube, Instagram, TikTok, Facebook, Twitter/X,
//    Vimeo, Dailymotion, Twitch, Reddit, Pinterest, SoundCloud,
//    Bandcamp, Bilibili, Rumble, LinkedIn, Snapchat, BBC, ESPN,
//    CNN, TED, Vevo, Flickr, Tumblr, VK, Odnoklassniki, Weibo,
//    Douyin, Kick, Loom, Streamable, Imgur, Gfycat/RedGifs,
//    9GAG, Coub, BitChute, Rumble, Niconico, Naver, Kakao, etc.

// 5. For those top platforms, also generate default FAQ JSON
//    and a brief description
```

### 2.4 Parent-Only Platform Pages

Only create public-facing service pages for **parent extractors** (no colon in the name). Sub-extractors like `youtube:playlist`, `tiktok:user`, `twitch:clips` etc. should be stored in the database for internal matching but should NOT generate individual service pages. They should appear under their parent platform's page.

### 2.5 The Seed Script Must Be Idempotent

Running it multiple times must NOT create duplicates. Use `upsert` with `slug` as the unique key. The script should be runnable as:

```bash
npm run db:seed-platforms
```

Add this script to `backend/package.json`:
```json
"db:seed-platforms": "tsx prisma/seed-platforms.ts"
```

### 2.6 Complete Platform List

For reference, below is the FULL list of all 1,800+ extractors from the official yt-dlp supported sites list. The seed script must include ALL of these. The following is the definitive list as of the current yt-dlp master branch — the script should dynamically pull from `yt-dlp --list-extractors` at runtime to stay current, but this list serves as the baseline:

<details>
<summary><strong>Click to expand: Complete list of ALL 1,800+ supported extractors</strong></summary>

```
10play, 10play:season, 17live, 17live:clip, 17live:vod, 1News, 1tv, 1tv:live, 20min, 23video, 247sports, 24tv.ua, 3qsdn, 3sat, 4tube, 56.com, 7plus, 8tracks, 9c9media, 9gag, 9News, 9now.com.au, abc.net.au, abc.net.au:iview, abc.net.au:iview:showseries, abcnews, abcnews:video, abcotvs, abcotvs:clips, AbemaTV, AbemaTVTitle, AcademicEarth:Course, acast, acast:channel, AcFunBangumi, AcFunVideo, ADN, ADNSeason, AdobeConnect, adobetv, AdultSwim, aenetworks, aenetworks:collection, aenetworks:show, AeonCo, agalega:videos, AirTV, AitubeKZVideo, Alibaba, AliExpressLive, AlJazeera, Allocine, Allstar, AllstarProfile, AlphaPorno, Alsace20TV, Alsace20TVEmbed, altcensored, altcensored:channel, Alura, AluraCourse, AmadeusTV, Amara, AmazonMiniTV, amazonminitv:season, amazonminitv:series, AmazonReviews, AmazonStore, AMCNetworks, AmericasTestKitchen, AmericasTestKitchenSeason, AmHistoryChannel, AnchorFMEpisode, anderetijden, Angel, AnimalPlanet, ant1newsgr:article, ant1newsgr:embed, antenna:watch, Anvato, aol.com, APA, Aparat, apple:music:connect, AppleDaily, ApplePodcasts, appletrailers, appletrailers:section, archive.org, ArcPublishing, ARD, ARDAudiothek, ARDAudiothekPlaylist, ARDMediathek, ARDMediathekCollection, Art19, Art19Show, arte.sky.it, ArteTV, ArteTVCategory, ArteTVEmbed, ArteTVPlaylist, asobichannel, asobichannel:tag, AsobiStage, AtresPlayer, AtScaleConfEvent, ATVAt, AudiMedia, AudioBoom, Audiodraft:custom, Audiodraft:generic, audiomack, audiomack:album, Audius, audius:artist, audius:playlist, audius:track, AWAAN, awaan:live, awaan:season, awaan:video, axs.tv, AZMedien, BaiduVideo, BanBye, BanByeChannel, Bandcamp, Bandcamp:album, Bandcamp:user, Bandcamp:weekly, Bandlab, BandlabPlaylist, BannedVideo, bbc, bbc.co.uk, bbc.co.uk:article, bbc.co.uk:iplayer:episodes, bbc.co.uk:iplayer:group, bbc.co.uk:playlist, BBVTV, BBVTVLive, BBVTVRecordings, BeaconTv, BeatBumpPlaylist, BeatBumpVideo, Beatport, Beeg, BehindKink, BerufeTV, Bet, bfi:player, bfmtv, bfmtv:article, bfmtv:live, bibeltv:live, bibeltv:series, bibeltv:video, Bigflix, Bigo, Bild, BiliBili, BilibiliAudio, BilibiliAudioAlbum, BiliBiliBangumi, BiliBiliBangumiMedia, BiliBiliBangumiSeason, BilibiliCheese, BilibiliCheeseSeason, BilibiliCollectionList, BiliBiliDynamic, BilibiliFavoritesList, BiliBiliPlayer, BilibiliPlaylist, BiliBiliSearch, BilibiliSeriesList, BilibiliSpaceAudio, BilibiliSpaceVideo, BilibiliWatchlater, BiliIntl, biliIntl:series, BiliLive, BioBioChileTV, Biography, BitChute, BitChuteChannel, Bitmovin, BlackboardCollaborate, BlackboardCollaborateLaunch, BleacherReport, BleacherReportCMS, blerp, blogger.com, Bloomberg, Bluesky, BokeCC, BongaCams, Boosty, BostonGlobe, Box, BoxCastVideo, Bpb, BR, BrainPOP, BrainPOPELL, BrainPOPEsp, BrainPOPFr, BrainPOPIl, BrainPOPJr, BravoTV, BreitBart, brightcove:legacy, brightcove:new, Brilliantpala:Classes, Brilliantpala:Elearn, bt:article, bt:vestlendingen, BTVPlus, Bundesliga, Bundestag, BunnyCdn, BusinessInsider, BuzzFeed, BYUtv, CaffeineTV, Callin, Caltrans, CAM4, Camdemy, CamdemyFolder, CamFMEpisode, CamFMShow, CamModels, Camsoda, CamtasiaEmbed, Canal1, CanalAlpha, canalc2.tv, Canalplus, Canalsurmas, CaracolTvPlay, cbc.ca, cbc.ca:listen, cbc.ca:player, cbc.ca:player:playlist, CBS, CBSLocal, CBSLocalArticle, CBSLocalLive, cbsnews, cbsnews:embed, cbsnews:live, cbsnews:livevideo, cbssports, cbssports:embed, CCMA, CCTV, CDA, CDAFolder, Cellebrite, CeskaTelevize, CGTN, CharlieRose, Chaturbate, Chilloutzone, chzzk:live, chzzk:video, cielotv.it, Cinemax, CinetecaMilano, Cineverse, CineverseDetails, CiscoLiveSearch, CiscoLiveSession, ciscowebex, CJSW, Clipchamp, Clippit, ClipRs, CloserToTruth, CloudflareStream, CloudyCDN, Clubic, Clyp, CNBCVideo, CNN, CNNIndonesia, ComedyCentral, ConanClassic, CondeNast, CONtv, CookingChannel, Corus, Coub, CozyTV, cp24, cpac, cpac:playlist, Cracked, Craftsy, CrooksAndLiars, CrowdBunker, CrowdBunkerChannel, Crtvg, CSpan, CSpanCongress, CtsNews, CTVNews, cu.ntv.co.jp, CultureUnplugged, curiositystream, curiositystream:collections, curiositystream:series, Cybrary, CybraryCourse, DacastPlaylist, DacastVOD, DagelijkseKost, DailyMail, dailymotion, dailymotion:playlist, dailymotion:search, dailymotion:user, DailyWire, DailyWirePodcast, damtomo:record, damtomo:video, dangalplay, dangalplay:season, daum.net, daum.net:clip, daum.net:playlist, daum.net:user, daystar:clip, DBTV, DctpTv, democracynow, DestinationAmerica, DetikEmbed, DeuxM, DeuxMNews, DHM, DigitalConcertHall, DigitallySpeaking, Digiteka, Digiview, DiscogsReleasePlaylist, DiscoveryLife, DiscoveryNetworksDe, DiscoveryPlus, DiscoveryPlusIndia, DiscoveryPlusIndiaShow, DiscoveryPlusItaly, DiscoveryPlusItalyShow, Disney, dlf, dlf:corpus, dlive:stream, dlive:vod, Douyin, DouyuShow, DouyuTV, DPlay, DRBonanza, Drooble, Dropbox, Dropout, DropoutSeason, DrTalks, DrTuber, drtv, drtv:live, drtv:season, drtv:series, DTube, duboku, duboku:list, Dumpert, Duoplay, dvtv, dw, dw:article, dzen.ru, dzen.ru:channel, EbaumsWorld, Ebay, egghead:course, egghead:lesson, eggs:artist, eggs:single, EinsUndEinsTV, EinsUndEinsTVLive, EinsUndEinsTVRecordings, eitb.tv, ElementorEmbed, Elonet, ElPais, ElTreceTV, Embedly, EMPFlix, Epicon, EpiconSeries, EpidemicSound, eplus, Epoch, Eporner, Erocast, EroProfile, EroProfile:album, ERRJupiter, ertflix, ertflix:codename, ertwebtv:embed, ESPN, ESPNArticle, ESPNCricInfo, EttuTv, Europa, EuroParlWebstream, EuropeanTour, Eurosport, EUScreen, EWETV, EWETVLive, EWETVRecordings, Expressen, EyedoTV, facebook, facebook:ads, facebook:reel, FacebookPluginsVideo, fancode:live, fancode:vod, Fathom, Faulio, FaulioLive, faz.net, fc2, fc2:embed, fc2:live, Fczenit, Fifa, filmon, filmon:channel, Filmweb, FiveThirtyEight, FiveTV, Flickr, Floatplane, FloatplaneChannel, Folketinget, FoodNetwork, FootyRoom, Formula1, FOX, FOX9, FOX9News, foxnews, foxnews:article, FoxNewsVideo, FoxSports, fptplay, FrancaisFacile, FranceCulture, FranceInter, francetv, francetv:site, francetvinfo.fr, Freesound, freespeech.org, freetv:series, FreeTvMovies, FrontendMasters, FrontendMastersCourse, FrontendMastersLesson, FujiTVFODPlus7, Funk, Funker530, Fux, FuyinTV, Gab, GabTV, Gaia, GameDevTVDashboard, GameJolt, GameJoltCommunity, GameJoltGame, GameJoltGameSoundtrack, GameJoltSearch, GameJoltUser, GameSpot, GameStar, Gaskrank, Gazeta, GBNews, GDCVault, GediDigital, gem.cbc.ca, gem.cbc.ca:live, gem.cbc.ca:playlist, Genius, GeniusLyrics, Germanupa, GetCourseRu, GetCourseRuPlayer, Gettr, GettrStreaming, GiantBomb, GlattvisionTV, GlattvisionTVLive, GlattvisionTVRecordings, Glide, GlobalPlayerAudio, GlobalPlayerAudioEpisode, GlobalPlayerLive, GlobalPlayerLivePlaylist, GlobalPlayerVideo, Globo, GloboArticle, glomex, glomex:embed, GMANetworkVideo, Go, GoDiscovery, GodResource, GodTube, Gofile, Golem, goodgame:stream, google:podcasts, google:podcasts:feed, GoogleDrive, GoogleDrive:Folder, GoPro, Goshgay, GoToStage, GPUTechConf, Graspop, Gronkh, gronkh:feed, gronkh:vods, Groupon, Harpodeon, hbo, HearThisAt, Heise, HellPorno, hetklokhuis, hgtv.com:show, HGTVDe, HGTVUsa, HiDive, HistoricFilms, history:player, history:topic, HitRecord, hketv, HollywoodReporter, HollywoodReporterPlaylist, Holodex, HotNewHipHop, hotstar, hotstar:series, hrfernsehen, HRTi, HRTiPlaylist, HSEProduct, HSEShow, html5, Huajiao, HuffPost, Hungama, HungamaAlbumPlaylist, HungamaSong, huya:live, huya:video, Hypem, Hytale, Icareus, IdagioAlbum, IdagioPersonalPlaylist, IdagioPlaylist, IdagioRecording, IdagioTrack, IdolPlus, iflix:episode, IflixSeries, ign.com, IGNArticle, IGNVideo, iheartradio, iheartradio:podcast, IlPost, Iltalehti, imdb, imdb:list, Imgur, imgur:album, imgur:gallery, Ina, Inc, IndavideoEmbed, InfoQ, Instagram, instagram:story, instagram:tag, instagram:user, InstagramIOS, Internazionale, InternetVideoArchive, InvestigationDiscovery, IPrima, IPrimaCNN, iq.com, iq.com:album, iqiyi, IslamChannel, IslamChannelSeries, IsraelNationalNews, ITProTV, ITProTVCourse, ITV, ITVBTCC, ivi, ivi:compilation, ivideon, Ivoox, IVXPlayer, iwara, iwara:playlist, iwara:user, Ixigua, Izlesene, Jamendo, JamendoAlbum, JeuxVideo, jiosaavn:album, jiosaavn:artist, jiosaavn:playlist, jiosaavn:show, jiosaavn:show:playlist, jiosaavn:song, Joj, Jove, JStream, JTBC, JTBC:program, JWPlatform, Kakao, Kaltura, KankaNews, Karaoketv, Katsomo, KelbyOne, Kenh14Playlist, Kenh14Video, khanacademy, khanacademy:unit, kick:clips, kick:live, kick:vod, Kicker, KickStarter, Kika, KikaPlaylist, kinja:embed, KinoPoisk, Kommunetv, KompasVideo, Koo, KrasView, KTH, Ku6, KukuluLive, kuwo:album, kuwo:category, kuwo:chart, kuwo:mv, kuwo:singer, kuwo:song, la7.it, la7.it:pod:episode, la7.it:podcast, laracasts, laracasts:series, LastFM, LastFMPlaylist, LastFMUser, LaXarxaMes, lbry, lbry:channel, lbry:playlist, LCI, Lcp, LcpPlay, Le, LearningOnScreen, Lecture2Go, Lecturio, LecturioCourse, LecturioDeCourse, LeFigaroVideoEmbed, LeFigaroVideoSection, LEGO, Lemonde, Lenta, LePlaylist, LetvCloud, Libsyn, life, life:embed, likee, likee:user, LinkedIn, linkedin:events, linkedin:learning, linkedin:learning:course, Liputan6, ListenNotes, LiTV, LiveJournal, livestream, livestream:original, Livestreamfails, Lnk, loc, Loco, loom, loom:folder, LoveHomePorn, LRTRadio, LRTStream, LRTVOD, LSMLREmbed, LSMLTVEmbed, LSMReplay, Lumni, lynda, lynda:course, maariv.co.il, MagellanTV, MagentaMusik, mailru, mailru:music, mailru:music:search, MainStreaming, mangomolo:live, mangomolo:video, MangoTV, ManotoTV, ManotoTVLive, ManotoTVShow, ManyVids, MaoriTV, Markiza, MarkizaPage, massengeschmack.tv, Masters, MatchTV, mave, mave:channel, MBN, MDR, MedalTV, media.ccc.de, media.ccc.de:lists, Mediaite, MediaKlikk, Medialaan, Mediaset, MediasetShow, Mediasite, MediasiteCatalog, MediasiteNamedCatalog, MediaStream, MediaWorksNZVOD, Medici, megaphone.fm, megatvcom, megatvcom:embed, Meipai, MelonVOD, Metacritic, mewatch, MicrosoftBuild, MicrosoftEmbed, MicrosoftLearnEpisode, MicrosoftLearnPlaylist, MicrosoftLearnSession, MicrosoftMedius, microsoftstream, minds, minds:channel, minds:group, Minoto, mir24.tv, mirrativ, mirrativ:user, MirrorCoUK, mixch, mixch:archive, mixch:movie, mixcloud, mixcloud:playlist, mixcloud:user, Mixlr, MixlrRecoring, MLB, MLBArticle, MLBTV, MLBVideo, MLSSoccer, MNetTV, MNetTVLive, MNetTVRecordings, MochaVideo, Mojevideo, Mojvideo, Monstercat, monstersiren, Motherless, MotherlessGallery, MotherlessGroup, MotherlessUploader, Motorsport, MovieFap, moviepilot, MoviewPlay, Moviezine, MovingImage, MSN, mtg, mtv, MTVUutisetArticle, MuenchenTV, MujRozhlas, Murrtube, MurrtubeUser, MuseAI, MuseScore, MusicdexAlbum, MusicdexArtist, MusicdexPlaylist, MusicdexSong, Mux, Mx3, Mx3Neo, Mx3Volksmusik, Mxplayer, MxplayerShow, MySpace, MySpace:album, MySpass, MyVideoGe, MyVidster, Mzaalo, n-tv.de, N1Info:article, N1InfoAsset, NascarClassics, Nate, NateProgram, natgeo:video, NationalGeographicTV, Naver, Naver:live, navernow, nba, nba:channel, nba:embed, nba:watch, nba:watch:collection, nba:watch:embed, NBC, NBCNews, nbcolympics, nbcolympics:stream, NBCSports, NBCSportsStream, NBCSportsVPlayer, NBCStations, ndr, ndr:embed, ndr:embed:base, NDTV, nebula:channel, nebula:media, nebula:subscriptions, nebula:video, NekoHacker, NerdCubedFeed, Nest, NestClip, NetAppCollection, NetAppVideo, netease:album, netease:djradio, netease:mv, netease:playlist, netease:program, netease:singer, netease:song, NetPlusTV, NetPlusTVLive, NetPlusTVRecordings, Netverse, NetversePlaylist, NetverseSearch, Netzkino, Newgrounds, Newgrounds:playlist, Newgrounds:user, NewsPicks, Newsy, NextMedia, NextMediaActionNews, NextTV, Nexx, NexxEmbed, nfb, nfb:series, NFHSNetwork, nfl.com, nfl.com:article, nfl.com:plus:episode, nfl.com:plus:replay, NhkForSchoolBangumi, NhkForSchoolProgramList, NhkForSchoolSubject, NhkRadioNewsPage, NhkRadiru, NhkRadiruLive, NhkVod, NhkVodProgram, nhl.com, nick.com, niconico, niconico:history, niconico:live, niconico:playlist, niconico:series, niconico:tag, NiconicoChannelPlus, NiconicoChannelPlus:channel:lives, NiconicoChannelPlus:channel:videos, NiconicoUser, nicovideo:search, nicovideo:search:date, nicovideo:search_url, NinaProtocol, Nintendo, Nitter, njoy, njoy:embed, NobelPrize, NoicePodcast, NonkTube, NoodleMagazine, NOSNLArticle, Nova, NovaEmbed, NovaPlay, NowCanal, nowness, nowness:playlist, nowness:series, Noz, npo, npo.nl:live, npo.nl:radio, npo.nl:radio:fragment, Npr, NRK, NRKPlaylist, NRKRadioPodkast, NRKSkole, NRKTV, NRKTVDirekte, NRKTVEpisode, NRKTVEpisodes, NRKTVSeason, NRKTVSeries, NRLTV, nts.live, ntv.ru, NubilesPorn, nuum:live, nuum:media, nuum:tab, Nuvid, NYTimes, NYTimesArticle, NYTimesCookingGuide, NYTimesCookingRecipe, nzherald, NZOnScreen, NZZ, ocw.mit.edu, Odnoklassniki, OfTV, OfTVPlaylist, OktoberfestTV, OlympicsReplay, on24, OnDemandChinaEpisode, OnDemandKorea, OnDemandKoreaProgram, OneFootball, OnePlacePodcast, onet.pl, onet.tv, onet.tv:channel, OnetMVP, OnionStudios, onsen, Opencast, OpencastPlaylist, openrec, openrec:capture, openrec:movie, OraTV, orf:fm4:story, orf:iptv, orf:on, orf:podcast, orf:radio, OsnatelTV, OsnatelTVLive, OsnatelTVRecordings, OutsideTV, OwnCloud, PacktPub, PacktPubCourse, PalcoMP3:artist, PalcoMP3:song, PalcoMP3:video, Panopto, PanoptoList, PanoptoPlaylist, ParamountPressExpress, Parler, parliamentlive.tv, Parlview, parti:livestream, parti:video, patreon, patreon:campaign, pbs, PBSKids, PearVideo, PeekVids, peer.tv, PeerTube, PeerTube:Playlist, peloton, peloton:live, PerformGroup, periscope, periscope:user, PGATour, PhilharmonieDeParis, phoenix.de, Photobucket, PiaLive, Piapro, picarto, picarto:vod, Piksel, Pinkbike, Pinterest, PinterestCollection, PiramideTV, PiramideTVChannel, PlanetMarathi, Platzi, PlatziCourse, play.tv, player.sky.it, PlayerFm, playeur, PlayPlusTV, PlaySuisse, Playtvak, PlayVids, Playwire, pluralsight, pluralsight:course, PlutoTV, PlVideo, PlyrEmbed, PodbayFM, PodbayFMChannel, Podchaser, podomatic, PokerGo, PokerGoCollection, PolsatGo, PolskieRadio, polskieradio:audition, polskieradio:category, polskieradio:legacy, polskieradio:player, polskieradio:podcast, polskieradio:podcast:list, Popcorntimes, PopcornTV, Pornbox, PornerBros, PornFlip, PornHub, PornHubPagedVideoList, PornHubPlaylist, PornHubUser, PornHubUserVideosUpload, Pornotube, PornoVoisines, PornoXO, PornTop, PornTube, Pr0gramm, PrankCast, PrankCastPost, PremiershipRugby, PressTV, ProjectVeritas, prosiebensat1, PRXAccount, PRXSeries, prxseries:search, prxstories:search, PRXStory, puhutv, puhutv:serie, Puls4, Pyvideo, QDance, QingTing, qqmusic, qqmusic:album, qqmusic:mv, qqmusic:playlist, qqmusic:singer, qqmusic:toplist, QuantumTV, QuantumTVLive, QuantumTVRecordings, R7, R7Article, Radiko, RadikoRadio, radio.de, Radio1Be, radiocanada, radiocanada:audiovideo, RadioComercial, RadioComercialPlaylist, radiofrance, RadioFranceLive, RadioFrancePodcast, RadioFranceProfile, RadioFranceProgramSchedule, RadioJavan, radiokapital, radiokapital:show, RadioRadicale, RadioZetPodcast, radlive, radlive:channel, radlive:season, Rai, RaiCultura, RaiNews, RaiPlay, RaiPlayLive, RaiPlayPlaylist, RaiPlaySound, RaiPlaySoundLive, RaiPlaySoundPlaylist, RaiSudtirol, RayWenderlich, RayWenderlichCourse, RbgTum, RbgTumCourse, RbgTumNewCourse, RCS, RCSEmbeds, RCSVarious, RCTIPlus, RCTIPlusSeries, RCTIPlusTV, RDS, RedBull, RedBullEmbed, RedBullTV, RedBullTVRrnContent, redcdnlivx, Reddit, RedGifs, RedGifsSearch, RedGifsUser, RedTube, RENTV, RENTVArticle, Restudy, Reuters, ReverbNation, RheinMainTV, RideHome, RinseFM, RinseFMArtistPlaylist, RMCDecouverte, RockstarGames, Rokfin, rokfin:channel, rokfin:search, rokfin:stack, RoosterTeeth, RoosterTeethSeries, RottenTomatoes, RoyaLive, Rozhlas, RozhlasVltava, RTBF, RTDocumentry, RTDocumentryPlaylist, rte, rte:radio, rtl.lu:article, rtl.lu:tele-vod, rtl.nl, rtl2, RTLLuLive, RTLLuRadio, RTNews, RTP, RTRFM, RTS, RTVCKaltura, RTVCPlay, RTVCPlayEmbed, rtve.es:alacarta, rtve.es:audio, rtve.es:live, rtve.es:program, rtve.es:television, rtvslo.si, rtvslo.si:show, RudoVideo, Rule34Video, Rumble, RumbleChannel, RumbleEmbed, Ruptly, rutube, rutube:channel, rutube:embed, rutube:movie, rutube:person, rutube:playlist, rutube:tags, Ruutu, Ruv, ruv.is:spila, S4C, S4CSeries, safari, safari:api, safari:course, Saitosan, SAKTV, SAKTVLive, SAKTVRecordings, SaltTV, SaltTVLive, SaltTVRecordings, SampleFocus, Sangiin, Sapo, SaucePlus, SBS, sbs.co.kr, sbs.co.kr:allvod_program, sbs.co.kr:programs_vod, schooltv, ScienceChannel, screen.yahoo:search, Screen9, Screencast, Screencastify, ScreencastOMatic, ScreenRec, ScrippsNetworks, scrippsnetworks:watch, Scrolller, SCTE, SCTECourse, sejm, Sen, SenalColombiaLive, senate.gov, senate.gov:isvp, SendtoNews, Servus, Sexu, SeznamZpravy, SeznamZpravyArticle, Shahid, ShahidShow, SharePoint, ShareVideosEmbed, ShemarooMe, Shiey, ShowRoomLive, ShugiinItvLive, ShugiinItvLiveRoom, ShugiinItvVod, SibnetEmbed, simplecast, simplecast:episode, simplecast:podcast, Sina, Skeb, sky.it, sky:news, sky:news:story, sky:sports, sky:sports:news, SkylineWebcams, skynewsarabia:article, skynewsarabia:video, SkyNewsAU, Slideshare, SlidesLive, Slutload, smotrim, smotrim:audio, smotrim:live, smotrim:playlist, SnapchatSpotlight, Snotr, SoftWhiteUnderbelly, Sohu, SohuV, SonyLIV, SonyLIVSeries, soop, soop:catchstory, soop:live, soop:user, soundcloud, soundcloud:playlist, soundcloud:related, soundcloud:search, soundcloud:set, soundcloud:trackstation, soundcloud:user, soundcloud:user:permalink, SoundcloudEmbed, soundgasm, soundgasm:profile, southpark.cc.com, southpark.cc.com:español, southpark.de, southpark.lat, southparkstudios.co.uk, southparkstudios.com.br, southparkstudios.nu, SovietsCloset, SovietsClosetPlaylist, SpankBang, SpankBangPlaylist, Spiegel, Sport5, SportBox, sporteurope, Spreaker, SpreakerShow, SpringboardPlatform, SproutVideo, sr:mediathek, SRGSSR, SRGSSRPlay, StacommuLive, StacommuVOD, StagePlusVODConcert, stanfordoc, startrek, startv, Steam, SteamCommunity, SteamCommunityBroadcast, Stitcher, StitcherShow, StoryFire, StoryFireSeries, StoryFireUser, Streaks, Streamable, StreamCZ, StreetVoice, StretchInternet, Stripchat, stv:player, stvr, Subsplash, subsplash:playlist, Substack, SunPorno, sverigesradio:episode, sverigesradio:publication, svt:page, svt:play, svt:play:series, SwearnetEpisode, Syfy, SYVDK, SztvHu, t-online.de, Tagesschau, TapTapApp, TapTapAppIntl, TapTapMoment, TapTapPostIntl, Tass, TBS, TBSJPEpisode, TBSJPPlaylist, TBSJPProgram, Teachable, TeachableCourse, teachertube, teachertube:user:collection, TeachingChannel, Teamcoco, TeamTreeHouse, techtv.mit.edu, TedEmbed, TedPlaylist, TedSeries, TedTalk, Tele13, Tele5, TeleBruxelles, TelecaribePlay, Telecinco, Telegraaf, telegram:embed, TeleMB, Telemundo, TeleQuebec, TeleQuebecEmission, TeleQuebecLive, TeleQuebecSquat, TeleQuebecVideo, TeleTask, Telewebion, Tempo, TennisTV, TF1, TFO, theatercomplextown:ppv, theatercomplextown:vod, TheChosen, TheChosenGroup, TheGuardianPodcast, TheGuardianPodcastPlaylist, TheHighWire, TheHoleTv, TheIntercept, ThePlatform, ThePlatformFeed, TheStar, TheSun, TheWeatherChannel, ThisAmericanLife, ThisOldHouse, ThisVid, ThisVidMember, ThisVidPlaylist, ThreeSpeak, ThreeSpeakUser, TikTok, tiktok:collection, tiktok:effect, tiktok:live, tiktok:sound, tiktok:tag, tiktok:user, TLC, TMZ, TNAFlix, TNAFlixNetworkEmbed, toggle, toggo, tokfm:audition, tokfm:podcast, ToonGoggles, tou.tv, toutiao, Toypics, ToypicsUser, TrailerAddict, TravelChannel, Triller, TrillerShort, TrillerUser, Trovo, TrovoChannelClip, TrovoChannelVod, TrovoVod, TrtCocukVideo, TrtWorld, TrueID, TruNews, Truth, ttinglive, Tube8, TubeTuGraz, TubeTuGrazSeries, tubitv, tubitv:series, Tumblr, tunein:embed, tunein:podcast, tunein:podcast:program, tunein:station, tv.dfb.de, TV2, TV2Article, TV2DK, TV2DKBornholmPlay, tv2play.hu, tv2playseries.hu, TV4, TV5MONDE, tv5unis, tv5unis:video, tv8.it, tv8.it:live, tv8.it:playlist, TVANouvelles, TVANouvellesArticle, tvaplus, TVC, TVCArticle, TVer, tvigle, TVIPlayer, TVN24, tvnoe, tvopengr:embed, tvopengr:watch, tvp, tvp:embed, tvp:stream, tvp:vod, tvp:vod:series, TVPlayer, TVPlayHome, tvw, tvw:news, tvw:tvchannels, Tweakers, TwitCasting, TwitCastingLive, TwitCastingUser, twitch:clips, twitch:collection, twitch:stream, twitch:videos, twitch:videos:clips, twitch:videos:collections, twitch:vod, twitter, twitter:amplify, twitter:broadcast, twitter:card, twitter:shortener, twitter:spaces, Txxx, udemy, udemy:course, UDNEmbed, UFCArabia, UFCTV, ukcolumn, UKTVPlay, UlizaPlayer, UlizaPortal, umg:de, Unistra, UnitedNationsWebTv, Unity, uol.com.br, uplynk, uplynk:preplay, Urort, URPlay, USANetwork, USAToday, ustream, ustream:channel, ustudio, ustudio:embed, Varzesh3, Vbox7, Veo, Vevo, VevoPlaylist, VGTV, vh1.com, vhx:embed, vice, vice:article, vice:show, Viddler, Videa, video.arnes.si, video.google:search, video.sky.it, video.sky.it:live, VideoDetective, videofy.me, VideoKen, VideoKenCategory, VideoKenPlayer, VideoKenPlaylist, VideoKenTopic, videomore, videomore:season, videomore:video, VideoPress, Vidflex, Vidio, VidioLive, VidioPremier, VidLii, Vidly, vids.io, Vidyard, viewlift, viewlift:embed, Viidea, vimeo, vimeo:album, vimeo:channel, vimeo:event, vimeo:group, vimeo:likes, vimeo:ondemand, vimeo:pro, vimeo:review, vimeo:user, vimeo:watchlater, Vimm:recording, Vimm:stream, ViMP, ViMP:Playlist, Viously, Viqeo, Viu, viu:ott, viu:playlist, ViuOTTIndonesia, vk, vk:uservideos, vk:wallpost, VKPlay, VKPlayLive, vm.tiktok, Vocaroo, VODPl, VODPlatform, voicy, voicy:channel, VolejTV, VoxMedia, VoxMediaVolume, vpro, vqq:series, vqq:video, vrsquare, vrsquare:channel, vrsquare:search, vrsquare:section, VRT, vrtmax, VTM, VTV, VTVGo, VTXTV, VTXTVLive, VTXTVRecordings, VuClip, VVVVID, VVVVIDShow, Walla, WalyTV, WalyTVLive, WalyTVRecordings, washingtonpost, washingtonpost:article, wat.tv, WatchESPN, WDR, wdr:mobile, WDRElefant, WDRPage, web.archive:youtube, Webcamerapl, Webcaster, WebcasterFeed, WebOfStories, WebOfStoriesPlaylist, Weibo, WeiboUser, WeiboVideo, WeiqiTV, wetv:episode, WeTvSeries, Weverse, WeverseLive, WeverseLiveTab, WeverseMedia, WeverseMediaTab, WeverseMoment, WeVidi, Weyyak, whowatch, Whyp, wikimedia.org, Wimbledon, WimTV, WinSportsVideo, Wistia, WistiaChannel, WistiaPlaylist, wnl, wordpress:mb.miniAudioPlayer, wordpress:playlist, WorldStarHipHop, wppilot, wppilot:channels, WrestleUniversePPV, WrestleUniverseVOD, WSJ, WSJArticle, WWE, wyborcza:video, WyborczaPodcast, wykop:dig, wykop:dig:comment, wykop:post, wykop:post:comment, XboxClips, XHamster, XHamsterEmbed, XHamsterUser, XiaoHongShu, ximalaya, ximalaya:album, Xinpianchang, XMinus, XNXX, Xstream, XVideos, xvideos:quickies, XXXYMovies, Yahoo, yahoo:japannews, YandexDisk, yandexmusic:album, yandexmusic:artist:albums, yandexmusic:artist:tracks, yandexmusic:playlist, yandexmusic:track, YandexVideo, YandexVideoPreview, YapFiles, Yappy, YappyProfile, yfanefa, YleAreena, YouJizz, youku, youku:show, YouNowChannel, YouNowLive, YouNowMoment, YouPorn, YouPornCategory, YouPornChannel, YouPornCollection, YouPornStar, YouPornTag, YouPornVideos, youtube, youtube:clip, youtube:favorites, youtube:history, youtube:music:search_url, youtube:notif, youtube:playlist, youtube:recommended, youtube:search, youtube:search:date, youtube:search_url, youtube:shorts:pivot:audio, youtube:subscriptions, youtube:tab, youtube:user, youtube:watchlater, YoutubeLivestreamEmbed, YoutubeYtBe, Zaiko, ZaikoETicket, Zapiks, Zattoo, ZattooLive, ZattooMovies, ZattooRecordings, zdf, zdf:channel, Zee5, zee5:series, ZeeNews, ZenPorn, ZetlandDKArticle, Zhihu, zingmp3, zingmp3:album, zingmp3:chart-home, zingmp3:chart-music-video, zingmp3:hub, zingmp3:liveradio, zingmp3:podcast, zingmp3:podcast-episode, zingmp3:user, zingmp3:week-chart, zoom, Zype, generic
```

</details>

---

## Section 3: Fix Dark/Light Mode — True Dark Mode (P1)

### 3.1 Problem

Current dark mode uses blue-tinted backgrounds, making it look washed out and not "true dark." The toggle works but the palette is wrong.

### 3.2 Required Color Palette

**Light Mode:**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFFFFF` | Main background |
| `--bg-secondary` | `#F8FAFC` | Cards, sections |
| `--bg-tertiary` | `#F1F5F9` | Subtle alternating rows |
| `--text-primary` | `#0F172A` | Main text |
| `--text-secondary` | `#64748B` | Muted text |
| `--border` | `#E2E8F0` | Borders |
| `--accent` | `#2563EB` | Brand blue (buttons, links, active states) |
| `--accent-hover` | `#1D4ED8` | Button hover |

**Dark Mode (TRUE dark):**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#020617` | Main background (slate-950) |
| `--bg-secondary` | `#0F172A` | Cards, sections (slate-900) |
| `--bg-tertiary` | `#1E293B` | Inputs, elevated surfaces (slate-800) |
| `--text-primary` | `#F8FAFC` | Main text (slate-50) |
| `--text-secondary` | `#94A3B8` | Muted text (slate-400) |
| `--border` | `#1E293B` | Borders (slate-800) |
| `--accent` | `#3B82F6` | Brand blue (slightly lighter for dark bg) |
| `--accent-hover` | `#60A5FA` | Button hover |

### 3.3 Tailwind Changes

Update `frontend/src/styles/globals.css`:

```css
.dark {
  --bg-primary: #020617;    /* TRUE BLACK — slate-950 */
  --bg-secondary: #0F172A;  /* slate-900 */
  --bg-tertiary: #1E293B;   /* slate-800 */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --border-color: #1E293B;
  --accent: #3B82F6;
}
```

Update the `body` base class:
```css
body {
  @apply bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-50 antialiased;
}
```

### 3.4 Key Rules

- **NO blue backgrounds in dark mode** — blue is accent only (buttons, links, active states, badges)
- Dark mode cards: `bg-slate-900` with `border-slate-800`
- Dark mode inputs: `bg-slate-800` with `border-slate-700`
- Dark mode hover states: `hover:bg-slate-800`
- Ensure WCAG AA contrast ratio (minimum 4.5:1 for text)
- Theme toggle in header must work with no flash-of-unstyled-content (FOUC) on page load

---

## Section 4: Homepage Redesign — World-Class Landing Page (P1)

### 4.1 Problem

Current homepage is basic. The hero is static, there are no scroll animations, sections are not well-defined, and the download flow shows useless "Job ID" messages instead of actual content.

### 4.2 Homepage Structure (Top to Bottom)

The homepage must have these sections in this exact order, each appearing with a subtle **fade-in-up animation on scroll** (use Intersection Observer API, NOT heavy animation libraries):

1. **Hero Section** (full viewport height on desktop, auto on mobile)
2. **How It Works** (3-step visual guide)
3. **Features Grid** (6 feature cards)
4. **Supported Platforms Showcase** (top platforms + "and X more" link)
5. **Latest Blog Posts** (3 cards, only if posts exist)
6. **Footer**

### 4.3 Hero Section — Detailed Specification

#### 4.3.1 Layout
- Full-width section with subtle gradient: `bg-gradient-to-b from-slate-50 to-white` (light) / `from-slate-950 to-[#020617]` (dark)
- Centered content, generous padding: `py-20 sm:py-28 lg:py-36`
- No background images, no visual noise

#### 4.3.2 Dynamic Rotating Platform Text (CRITICAL FEATURE)

The H1 headline must use a **text rotator / word-switch animation** pattern:

**Static text:** "Download Videos From"
**Rotating text:** Cycles through platform names, then a summary phrase

**Rotation sequence (loop forever):**
1. "YouTube" → displayed in **#FF0000** (YouTube red)
2. "Facebook" → displayed in **#1877F2** (Facebook blue)
3. "Instagram" → displayed in **#E4405F** (Instagram gradient pink)
4. "TikTok" → displayed in **#000000** light mode / **#FFFFFF** dark mode (TikTok)
5. "Twitter" → displayed in **#000000** light mode / **#FFFFFF** dark mode (X/Twitter)
6. "1800+ Platforms" → displayed in the **default brand accent color** (`#2563EB`)
7. → Loop back to "YouTube"

**Animation type:** Smooth **fade-out-up → fade-in-up** transition. Each name stays visible for **2.5 seconds**, then fades out upward while the next fades in from below. Total cycle: ~15 seconds before restart.

**Implementation:**
```tsx
// React component pseudocode:
const platforms = [
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'Instagram', color: '#E4405F' },
  { name: 'TikTok', color: 'currentColor' }, // inherits text color
  { name: 'Twitter', color: 'currentColor' },
  { name: '1800+ Platforms', color: '#2563EB' },
];
// Use setInterval + CSS transition/animation for smooth rotation
// The rotator word must have a fixed container width (use the widest word's width)
// to prevent layout shift during rotation
```

**The full H1 reads:**
> Download Videos From **[YouTube]**

Where `[YouTube]` rotates through the list above.

#### 4.3.3 Download Input
- Below the H1: Large URL input field with a bold "Download" CTA button
- Placeholder text: "Paste any video URL here..."
- The input + button should be in a single row on desktop, stacked on mobile
- The input must be the SAME download component used on service pages (shared component)

#### 4.3.4 Trust Indicator
- Small text below the input: "Free • No Registration • 1,800+ Platforms Supported"
- Use muted text color, small font

### 4.4 Scroll Animation Behavior

Every section below the hero must **appear on scroll** using a subtle `fade-in-up` animation:

- **Trigger:** When the section enters 20% of the viewport
- **Animation:** Opacity 0 → 1, translateY(30px) → 0, over 600ms ease-out
- **Implementation:** Use `IntersectionObserver` with a small React hook. Do NOT use Framer Motion or heavy libraries. Pure CSS transitions triggered by adding a class:

```css
.scroll-animate {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.scroll-animate.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 4.5 Supported Platforms Section

- Show top 12 platforms as clean cards (icon/initial + name only, NO download count)
- Below the grid: **"And 1,800+ more platforms →"** link to `/services`
- The count should be dynamic (fetched from API: total active platforms count)

### 4.6 All Homepage Sections Must Be Mobile-Responsive

- Hero: single column, smaller heading, full-width input
- How It Works: vertical stack on mobile
- Features: 1 column on mobile, 2 on tablet, 3 on desktop
- Platforms: 2 columns on mobile, 3 on tablet, 4 on desktop

---

## Section 5: Fix Download Flow — Real Preview + Direct Download (P1)

### 5.1 Problem

Current download flow shows "Video found! Your download has been queued. Job ID: 4" — this is USELESS to users. They need to see the actual video, choose quality, and download immediately.

### 5.2 Required Download Flow (Step by Step)

#### Step 1: User Pastes URL and Clicks "Download"
- Show a loading spinner with text "Analyzing video..."
- The frontend calls `POST /api/v1/downloads/analyze` with the URL

#### Step 2: Backend Analyzes with yt-dlp
The API must run: `yt-dlp --dump-json --no-download --no-playlist <URL>`

This returns a JSON object containing:
- `title` — Video title
- `thumbnail` — Thumbnail URL
- `duration` — Duration in seconds
- `uploader` — Channel/uploader name
- `formats` — Array of ALL available formats with:
  - `format_id`
  - `ext` (mp4, webm, mp3, etc.)
  - `resolution` or `format_note` (1080p, 720p, etc.)
  - `filesize` or `filesize_approx` (in bytes)
  - `vcodec` / `acodec`
  - `fps`

**CRITICAL:** The API must process this **synchronously** (not via queue) for the analysis step. The analysis should complete within 5-15 seconds. Queue is only for the actual download. If yt-dlp takes too long, use a timeout of 30 seconds.

#### Step 3: Frontend Shows Preview Card
After receiving the analysis response, display a **video preview card** containing:

```
┌──────────────────────────────────────────┐
│  [Thumbnail Image]                       │
│                                          │
│  Title: "Rick Astley - Never Gonna..."   │
│  Duration: 3:32                          │
│  Channel: Rick Astley                    │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ Format    │ Quality  │ Size  │ ↓    │ │
│  ├───────────┼──────────┼───────┼──────┤ │
│  │ MP4       │ 1080p    │ 45MB  │ [DL] │ │
│  │ MP4       │ 720p     │ 22MB  │ [DL] │ │
│  │ MP4       │ 480p     │ 12MB  │ [DL] │ │
│  │ MP4       │ 360p     │ 7MB   │ [DL] │ │
│  │ WebM      │ 1080p    │ 38MB  │ [DL] │ │
│  │ MP3       │ Audio    │ 3MB   │ [DL] │ │
│  │ M4A       │ Audio    │ 4MB   │ [DL] │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Format table rules:**
- Group by video formats first, then audio-only formats
- Show file size in human-readable format (MB/GB)
- If `filesize` is null, show "~" (estimated) or omit the size column
- Each row has its own **individual download button**
- Sort video formats by resolution descending (best quality first)
- Filter out duplicate/useless formats (e.g., video-only without audio, manifest-only)

**Smart format filtering logic:**
```
For display, filter formats to only show:
1. Combined video+audio formats (where both vcodec != "none" and acodec != "none")
   OR
2. If no combined formats exist, show the "best" merged format option
3. Audio-only formats (acodec != "none" and vcodec == "none")
4. Skip formats with no filesize AND no resolution
5. Deduplicate: if two formats have same resolution and ext, keep the one with better codec
```

#### Step 4: User Clicks Download Button
- Clicking a download button for a specific format triggers: `POST /api/v1/downloads/initiate` with `{ url, format: formatId }`
- The backend runs: `yt-dlp -f <formatId> -o - <URL>` and **streams the file directly** to the user
- OR: The backend runs yt-dlp, gets the direct media URL, and redirects the user's browser to it
- The file MUST start downloading to the user's device **immediately**
- Show a brief "Starting download..." toast notification

#### Step 5: Force Download to Device
The response must include proper headers:
```
Content-Disposition: attachment; filename="video-title.mp4"
Content-Type: application/octet-stream
```
This forces the browser to download the file rather than playing it inline.

### 5.3 Backend API Changes

#### New endpoint: `POST /api/v1/downloads/analyze` (SYNCHRONOUS)
This must NOT go through BullMQ. It must be a direct synchronous yt-dlp call:

```typescript
// Pseudocode:
const result = await runYtDlp(['--dump-json', '--no-download', '--no-playlist', url]);
const info = JSON.parse(result.stdout);
return {
  title: info.title,
  thumbnail: info.thumbnail,
  duration: info.duration,
  uploader: info.uploader,
  formats: filterAndSortFormats(info.formats),
  platform: detectPlatform(url),
};
```

#### Updated endpoint: `POST /api/v1/downloads/initiate`
Option A (Recommended): Return a temporary download URL that the frontend opens in a new tab:
```typescript
// Server generates the direct download URL via yt-dlp
const directUrl = await getDirectUrl(url, formatId);
return { downloadUrl: directUrl };
// Frontend: window.open(downloadUrl, '_blank')
```

Option B: Stream through the server:
```typescript
// Stream yt-dlp output directly to the HTTP response
const proc = spawn('yt-dlp', ['-f', formatId, '-o', '-', url]);
reply.header('Content-Disposition', `attachment; filename="${safeFilename}.${ext}"`);
reply.header('Content-Type', 'application/octet-stream');
proc.stdout.pipe(reply.raw);
```

### 5.4 Error Handling for Downloads
- If yt-dlp returns an error (geo-blocked, DRM, age-restricted): show a clear, user-friendly error message WITHOUT mentioning yt-dlp
- Example: "This video cannot be downloaded. It may be geo-restricted, age-gated, or protected by DRM."
- Never show raw yt-dlp error output to users

---

## Section 6: Global Navigation Search — Instant Platform Search (P2)

### 6.1 Problem

There is no way for users to search for a specific platform from the header. Users must navigate to `/services` first.

### 6.2 Required Behavior

- In the header navbar, add a **search icon** (on mobile) or a **search input field** (on desktop)
- On desktop: Show a compact search input (placeholder: "Search platforms...") directly in the nav bar
- On mobile: Show a **search icon** that expands into a full-width overlay search bar when tapped — **it must NOT zoom the page**
- Prevent zoom on mobile: add `font-size: 16px` to the input (iOS zooms on inputs with font-size < 16px)

### 6.3 Instant Search with Dropdown Suggestions

As the user types:
- After **1 character**, start filtering platforms
- Show a **dropdown suggestion list** below the search input (max 8 results)
- Each suggestion shows: Platform name
- Clicking a suggestion navigates to `/{slug}-video-downloader`
- Pressing Enter with text navigates to `/services/search/{query}`
- The search is **client-side** against a cached list of all platform names (fetched once on app load and stored in Zustand/context)
- The dropdown should close when clicking outside or pressing Escape

### 6.4 Implementation Notes

- Fetch all platforms (just name + slug, lightweight) on initial app load: `GET /api/v1/platforms?pageSize=2000&fields=name,slug`
- Store in Zustand store or React context for instant filtering
- Use `String.includes()` for fuzzy matching (case-insensitive)
- Debounce is NOT needed since this is client-side filtering, not API calls
- The search must NEVER cause the mobile viewport to zoom

---

## Section 7: Platforms Listing Page — Pagination + Sort + Instant Search (P2)

### 7.1 URL: `/services`

### 7.2 Required Features

- **Instant search bar** at the top — filters as user types (client-side if under 2000 platforms, server-side if more)
- **Sort options:** Alphabetical A→Z (default), Alphabetical Z→A, Recently Added
- **NO download counts displayed** — remove completely from the card and any sorting by popularity
- **Pagination:** 48 platforms per page, numbered pagination with prev/next
- **Card design:** Clean card with platform initial/logo and name only. No description, no download count
- **Mobile:** 2 columns. Tablet: 3 columns. Desktop: 4 columns
- Each card links to `/{slug}-video-downloader`

### 7.3 Search Behavior

- Show a prominent search input at the top: "Search 1,800+ platforms..."
- As the user types, results filter **in real-time** (debounce 150ms if server-side)
- Results should update the grid immediately without full page reload
- If no results: show "No platforms found for '{query}'. Try a different search term."

### 7.4 Sort Controls

- Dropdown or button group: "A-Z" | "Z-A" | "Newest"
- Changing sort should reset to page 1 and preserve search query

---

## Section 8: Full Responsive Fix — Public + Admin (P3)

### 8.1 Problem

The platform is not responsive. Admin pages are broken on mobile. The mobile hamburger menu disappears on admin pages.

### 8.2 Public Pages — Mobile Breakpoints

All public pages must be fully responsive at:
- **Mobile:** < 640px (single column, full-width elements, hamburger nav)
- **Tablet:** 640px – 1024px (2-column grids, compact nav)
- **Desktop:** > 1024px (full layout)

Specific fixes:
- Header: hamburger menu must work and show all nav links + search
- Download form: full-width input + button stacked vertically on mobile
- Blog cards: 1 column on mobile
- Platform cards: 2 columns on mobile
- Footer: single column on mobile
- All text: readable without horizontal scroll

### 8.3 Admin Panel — Mobile Responsive

The admin panel must be usable on mobile:
- **Sidebar:** Hidden by default on mobile. Show a **hamburger icon** in the top-left that opens a slide-over sidebar overlay (NOT a fixed sidebar that takes up screen space)
- **Hamburger MUST be visible** on all admin pages on mobile — it is currently missing
- **Data tables:** Horizontally scrollable on mobile with `overflow-x-auto`
- **Forms:** Full-width, single column on mobile
- **Dashboard charts:** Stack vertically on mobile, each taking full width
- **Dashboard stat cards:** 2 columns on mobile (not 6)

### 8.4 Admin Mobile Sidebar Implementation

```tsx
// On mobile (< 1024px):
// - Show a hamburger button fixed to the top-left
// - Clicking it opens a full-height sidebar overlay from the left
// - Backdrop: semi-transparent black overlay
// - Close button inside the sidebar
// - Clicking a nav link closes the sidebar
// - Clicking backdrop closes the sidebar
```

---

## Section 9: Admin Panel Fixes (P3)

### 9.1 Charts — Use Line Charts Only

Replace all pie charts and bar charts with **line charts** (Recharts `<LineChart>`):
- Downloads over time: Line chart (already correct)
- Platform comparison: Horizontal bar chart is acceptable, but primary view should be line
- Status breakdown: Remove the pie chart; show as stat cards instead

### 9.2 TipTap Rich Text Editor — MUST Be Used

The current CMS uses plain `<textarea>` elements. This must be replaced with the **TipTap rich text editor** for:
- Blog post content editing (`/admin/posts/new` and `/admin/posts/[id]`)
- Static page content editing (`/admin/pages/new` and `/admin/pages/[id]`)

TipTap configuration must include:
- Bold, Italic, Underline, Strikethrough
- Headings (H2, H3, H4)
- Bullet list, Ordered list
- Links (with URL input modal)
- Images (with URL input or drag-and-drop upload)
- Code blocks
- Blockquotes
- Horizontal rules
- Undo/Redo

Packages already in `package.json`: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`

### 9.3 Dashboard Date Range Filter

The date range filter already exists but must work correctly. Ensure:
- Changing the date range re-fetches ALL dashboard data (stats + charts)
- "Custom Range" shows a date picker
- Default is "Last 28 Days"

---

## Section 10: SEO Optimization (P4)

### 10.1 Every Public Page Must Have

- Unique `<title>` tag following pattern: `{Page Title} | {site_name}`
- Unique `<meta name="description">` (150-160 chars)
- Canonical URL: `<link rel="canonical" href="{site_url}/{path}">`
- Open Graph tags: `og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `og:site_name`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Robots: `<meta name="robots" content="index, follow">`
- Language: `<html lang="en">`
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">`

### 10.2 Service Pages (/{slug}-video-downloader)

Each service page must have:
- **Unique H1:** "Download {Platform} Videos Free"
- **Unique meta description:** "Download videos from {Platform} in HD quality. Free, fast, and no registration needed. {site_name} supports {Platform} video and audio downloads."
- **FAQPage structured data** (from `faqJson` in database)
- **SoftwareApplication structured data**
- **BreadcrumbList structured data:** Home > Services > {Platform} Downloader
- **Related Downloaders section** (4-6 related platforms, NO download counts)
- **Internal linking:** Each service page links to related platforms
- **Platform-specific content:** Minimum 200 words of unique body copy per platform

### 10.3 Sitemaps

All sitemap endpoints must work correctly and include:
- `/sitemap-index.xml` — references all sub-sitemaps
- `/services.xml` — ALL active platforms with their full path url e.g site.com/{slug}-video-downloader i.e site.com/facebook-video-downloader, site.com/youtube-video-downloader, etc

- `/blog.xml` — ALL published posts full path urls
- `/categories.xml` — ALL categories
- `/pages.xml` — Static pages + core routes (homepage, services, blog, library, about us, contact us).
### 10.4 Never Expose Internal Technology

- No page source or meta tag should mention "yt-dlp", "youtube-dl", "BullMQ", or any internal tooling
- Error messages should be generic and user-friendly
- API response JSON should not include internal implementation details

---

## Section 11: Service/Downloader Page Polish (P4)

### 11.1 Each /{slug}-video-downloader Page Must Have:

1. Breadcrumb navigation (visual + schema)
2. Platform name and initial/logo prominently displayed
3. The shared download form component (same as homepage)
4. Platform-specific description (from DB)
5. FAQ accordion (from DB `faqJson`)
6. Related downloaders section (4-6 cards, NO download counts)
7. NO mention of "yt-dlp" anywhere

### 11.2 Related Downloaders

- Show 4-6 other platforms as simple cards
- Each card: Platform initial + name only
- Randomize selection but prefer same-category platforms
- NO download count

---

## Section 12: Final Cleanup & QA Checklist (P5)

### 12.1 Pre-Launch Checklist

- [ ] yt-dlp installed and `yt-dlp --version` works from the backend process
- [ ] ffmpeg installed and accessible
- [ ] ALL 1,800+ platforms seeded in database
- [ ] Top 50 platforms set to `isActive: true`
- [ ] Dark mode is TRUE dark (no blue tint)
- [ ] Homepage hero rotator works with brand colors
- [ ] Download flow shows real preview with thumbnail, title, formats
- [ ] Downloads actually download files to user's device
- [ ] Global search in nav works with instant suggestions
- [ ] Mobile search does NOT cause viewport zoom
- [ ] Platforms page is paginated, searchable, sortable
- [ ] Admin hamburger menu works on mobile
- [ ] Admin uses TipTap editor for content
- [ ] All admin pages responsive on mobile
- [ ] All charts use line charts
- [ ] No "yt-dlp" text appears anywhere user-facing
- [ ] No download counts on any user-facing page
- [ ] All pages have proper SEO meta tags
- [ ] All pages have structured data
- [ ] Sitemaps generate correctly
- [ ] robots.txt works
- [ ] 404 page is styled and functional
- [ ] Dark/light mode toggle works without FOUC
- [ ] All sections on homepage animate on scroll
- [ ] Performance: Lighthouse > 90 on mobile

### 12.2 Removed/Forbidden Elements

| Element | Reason |
|---------|--------|
| "yt-dlp" in any user-facing text | Internal tool, must never be disclosed |
| Download counts on public pages | Admin-only metric |
| "Job ID: X" messages | Useless to users |
| Blue-tinted dark mode backgrounds | Must be TRUE dark |
| Pie charts in admin | Use line charts only |
| Plain textarea for CMS content | Must use TipTap editor |
| Non-responsive layouts | Everything must be mobile-first |
| Viewport zoom on mobile search | Set input font-size >= 16px |

---

## Appendix A: Brand Color Reference for Platform Rotator

| Platform | Brand Color | Notes |
|----------|-------------|-------|
| YouTube | `#FF0000` | Official red |
| Facebook | `#1877F2` | Official blue |
| Instagram | `#E4405F` | Gradient pink (use solid for text) |
| TikTok | `currentColor` | Black in light mode, white in dark mode |
| Twitter / X | `currentColor` | Black in light mode, white in dark mode |
| Vimeo | `#1AB7EA` | Official blue |
| Twitch | `#9146FF` | Official purple |
| Reddit | `#FF4500` | Official orange |
| Spotify | `#1DB954` | Official green |
| SoundCloud | `#FF5500` | Official orange |
| Dailymotion | `#00D2F3` | Official cyan |
| Pinterest | `#E60023` | Official red |

---

## Appendix B: Admin Global Settings Reminder

ALL brand references — `site_name`, `site_url`, `site_tagline`, `site_description`, logos, OG images, footer text, analytics IDs — MUST come from the Admin Global Settings page (stored in `global_settings` DB table) with `.env` fallback. No hardcoded brand names anywhere.

---

**END OF PRD v3.0 — Patch & Enhancement Document**

*This document covers all fixes and enhancements to be applied incrementally to the existing deployed codebase. Build in priority order (P0 → P5) as specified in the Build Order table.*
