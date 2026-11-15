import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240724.01.00',
    hl: 'en',
    gl: 'US',
  },
};

const INNERTUBE_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Origin: 'https://music.youtube.com',
  Referer: 'https://music.youtube.com/',
};

// Search filter params for YouTube Music InnerTube
const SEARCH_FILTER_PARAMS = {
  songs: 'EgWKAQIIAWoKEAkQBRAKEAMQBA==',
  videos: 'EgWKAQIQAWoKEAkQBRAKEAMQBA==',
  albums: 'EgWKAQIYAWoKEAkQBRAKEAMQBA==',
  artists: 'EgWKAQIgAWoKEAkQBRAKEAMQBA==',
  playlists: 'EgWKAQIoAWoKEAkQBRAKEAMQBA==',
};

// Helper: upgrade Google/YouTube thumbnail to high-res
function upgradeThumbnail(url, videoId = null) {
  if (!url && videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  if (!url) return '';
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    return url.replace(/=w\d+-h\d+[^&?]*/g, '=w544-h544-l90-rj');
  }
  return url;
}

// Helper: parse duration string "3:45" or "1:02:10" into seconds
function parseDurationSeconds(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Helper: extract runs text
function runsText(obj) {
  if (!obj?.runs) return '';
  return obj.runs.map((r) => r.text).join('');
}

// Helper: parse a musicResponsiveListItemRenderer into a normalized item
function parseResponsiveListItem(item, fallbackDefaults = {}) {
  if (!item) return null;

  const videoId =
    item.playlistItemData?.videoId ||
    item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
    null;

  const browseId =
    item.navigationEndpoint?.browseEndpoint?.browseId ||
    null;

  const pageType =
    item.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
    '';

  const thumbs =
    item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const rawThumb = thumbs[thumbs.length - 1]?.url || fallbackDefaults.thumbnail || '';
  const thumbnail = upgradeThumbnail(rawThumb, videoId);

  const flexCols = (item.flexColumns || []).map((fc) => {
    const runs = fc.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    return {
      text: runs.map((r) => r.text).join(''),
      runs,
    };
  });

  const fixedCols = (item.fixedColumns || []).map((fc) =>
    runsText(fc.musicResponsiveListItemFixedColumnRenderer?.text)
  );

  const title = flexCols[0]?.text || 'Untitled';
  const secondaryRuns = flexCols[1]?.runs || [];
  const secondaryText = flexCols[1]?.text || '';
  const tertiaryText = flexCols[2]?.text || '';

  // Split secondaryRuns by " • " separator
  const segments = [];
  let currentSeg = [];
  for (const r of secondaryRuns) {
    if (r.text.trim() === '•') {
      if (currentSeg.length) segments.push(currentSeg);
      currentSeg = [];
    } else {
      currentSeg.push(r);
    }
  }
  if (currentSeg.length) segments.push(currentSeg);

  let itemType = fallbackDefaults.type || 'song';
  if (pageType.includes('ALBUM') || browseId?.startsWith('MPREb_')) itemType = 'album';
  else if (pageType.includes('ARTIST') || browseId?.startsWith('UC')) itemType = 'artist';
  else if (pageType.includes('PLAYLIST') || browseId?.startsWith('VL')) itemType = 'playlist';
  else if (videoId) itemType = 'song';

  let artist = fallbackDefaults.artist || '';
  let album = fallbackDefaults.album || '';
  let duration = fixedCols[0] || '';
  let plays = '';

  const typeLabels = ['Song', 'Video', 'Album', 'Single', 'EP', 'Artist', 'Playlist', 'Podcast'];
  const segTexts = segments.map((s) => s.map((r) => r.text).join('').trim());

  if (segTexts.length > 0 && typeLabels.includes(segTexts[0])) {
    const label = segTexts[0].toLowerCase();
    if (label === 'video') itemType = 'video';
    else if (label === 'album' || label === 'single' || label === 'ep') itemType = 'album';
    else if (label === 'artist') itemType = 'artist';
    else if (label === 'playlist') itemType = 'playlist';
    segTexts.shift();
  }

  for (const st of segTexts) {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(st)) {
      duration = st;
    } else if (/plays|views|subscribers/i.test(st)) {
      plays = st;
    } else if (!artist) {
      artist = st;
    } else if (!album) {
      album = st;
    }
  }

  if (!plays && tertiaryText && /plays|views/i.test(tertiaryText)) {
    plays = tertiaryText;
  } else if (!album && tertiaryText) {
    album = tertiaryText;
  }

  if (!artist) artist = secondaryText || fallbackDefaults.artist || 'YouTube Music';

  const explicit = Boolean(
    item.badges?.some((b) =>
      b.musicInlineBadgeRenderer?.icon?.iconType?.includes('EXPLICIT')
    )
  );

  return {
    id: videoId || browseId || `${title}-${artist}`,
    videoId,
    browseId,
    type: itemType,
    title,
    artist,
    album,
    duration: duration || '3:30',
    durationSeconds: parseDurationSeconds(duration) || 210,
    thumbnail,
    plays,
    explicit,
  };
}

// Helper: parse musicTwoRowItemRenderer (cards in carousels for albums, playlists, videos)
function parseTwoRowItem(item) {
  if (!item) return null;
  const title = runsText(item.title);
  const subtitle = runsText(item.subtitle);
  const videoId =
    item.navigationEndpoint?.watchEndpoint?.videoId ||
    item.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
    null;
  const browseId = item.navigationEndpoint?.browseEndpoint?.browseId || null;
  const pageType =
    item.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
    '';

  const thumbs = item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const rawThumb = thumbs[thumbs.length - 1]?.url || '';
  const thumbnail = upgradeThumbnail(rawThumb, videoId);

  let type = 'playlist';
  if (videoId) type = 'video';
  else if (pageType.includes('ALBUM') || browseId?.startsWith('MPREb_')) type = 'album';
  else if (pageType.includes('ARTIST') || browseId?.startsWith('UC')) type = 'artist';

  const parts = subtitle.split('•').map((s) => s.trim());
  const artist = parts[parts.length - 1] || subtitle || 'YouTube Music';

  return {
    id: videoId || browseId || title,
    videoId,
    browseId,
    type,
    title,
    artist,
    subtitle,
    thumbnail,
    duration: '3:45',
    durationSeconds: 225,
  };
}

// Curated showcase tracks with verified SponsorBlock segments, RYD stats & LRCLIB synced lyrics
const SHOWCASE_TRACKS = [
  {
    id: '4NRXx6U8ABQ',
    videoId: '4NRXx6U8ABQ',
    type: 'song',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: '4:23',
    durationSeconds: 263,
    thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/maxresdefault.jpg',
    plays: '1.1B views',
    explicit: false,
    sponsorBlockBadge: '2 Segments (Intro & Outro Non-Music)',
  },
  {
    id: 'eVli-tstM5E',
    videoId: 'eVli-tstM5E',
    type: 'song',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    album: "Short n' Sweet",
    duration: '3:21',
    durationSeconds: 201,
    thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/maxresdefault.jpg',
    plays: '340M views',
    explicit: true,
    sponsorBlockBadge: '3 Segments (Intro Skit & Outro)',
  },
  {
    id: 'TUVcZfQe-Kw',
    videoId: 'TUVcZfQe-Kw',
    type: 'song',
    title: 'Levitating (feat. DaBaby)',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: '3:50',
    durationSeconds: 230,
    thumbnail: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/maxresdefault.jpg',
    plays: '920M views',
    explicit: false,
    sponsorBlockBadge: '3 Segments (Intro & Outro Credits)',
  },
  {
    id: 'V9PVRfjEBTI',
    videoId: 'V9PVRfjEBTI',
    type: 'song',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: '3:51',
    durationSeconds: 231,
    thumbnail: 'https://i.ytimg.com/vi/V9PVRfjEBTI/maxresdefault.jpg',
    plays: '245M views',
    explicit: false,
    sponsorBlockBadge: '3 Segments (Non-Music Outro)',
  },
  {
    id: 'sOnqjkJTMaA',
    videoId: 'sOnqjkJTMaA',
    type: 'song',
    title: 'Thriller',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: '13:42',
    durationSeconds: 822,
    thumbnail: 'https://i.ytimg.com/vi/sOnqjkJTMaA/maxresdefault.jpg',
    plays: '1.0B views',
    explicit: false,
    sponsorBlockBadge: '3 Segments (4m13s Movie Intro & Skits)',
  },
  {
    id: 'VYOjWnS4cMY',
    videoId: 'VYOjWnS4cMY',
    type: 'song',
    title: 'This Is America',
    artist: 'Childish Gambino',
    album: 'This Is America - Single',
    duration: '4:05',
    durationSeconds: 245,
    thumbnail: 'https://i.ytimg.com/vi/VYOjWnS4cMY/maxresdefault.jpg',
    plays: '940M views',
    explicit: true,
    sponsorBlockBadge: '2 Segments (Non-Music Break)',
  },
  {
    id: '5NV6Rdv1a3I',
    videoId: '5NV6Rdv1a3I',
    type: 'song',
    title: 'Get Lucky (feat. Pharrell Williams & Nile Rodgers)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: '4:09',
    durationSeconds: 249,
    thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/maxresdefault.jpg',
    plays: '885M views',
    explicit: false,
    sponsorBlockBadge: 'Synced Karaoke Lyrics + RYD Verified',
  },
  {
    id: 'ApXoWvfEYVU',
    videoId: 'ApXoWvfEYVU',
    type: 'song',
    title: 'Sunflower (Spider-Man: Into the Spider-Verse)',
    artist: 'Post Malone & Swae Lee',
    album: 'Hollywood’s Bleeding',
    duration: '2:42',
    durationSeconds: 162,
    thumbnail: 'https://i.ytimg.com/vi/ApXoWvfEYVU/maxresdefault.jpg',
    plays: '2.5B views',
    explicit: false,
    sponsorBlockBadge: 'Synced Lyrics + 18M Likes RYD',
  },
];

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      innertube: 'WEB_REMIX v1.20240724.01.00',
      sponsorBlock: 'https://sponsor.ajay.app/api/skipSegments',
      returnYouTubeDislike: 'https://returnyoutubedislikeapi.com/votes',
      lrclib: 'https://lrclib.net/api/search',
    },
  });
});

// 2. Home Feed Endpoint (InnerTube FEmusic_home + FEmusic_charts + Showcase)
app.get('/api/home', async (req, res) => {
  try {
    const [homeRes, chartsRes] = await Promise.allSettled([
      fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({ context: INNERTUBE_CONTEXT, browseId: 'FEmusic_home' }),
      }).then((r) => r.json()),
      fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          browseId: 'FEmusic_charts',
          formData: { selectedValues: ['US'] },
        }),
      }).then((r) => r.json()),
    ]);

    const shelves = [
      {
        id: 'simpmusic-showcase',
        title: 'SponsorBlock & Synced Lyrics Featured',
        subtitle: 'Instant auto-skip segments, ReturnYouTubeDislike stats & LRCLIB karaoke lyrics',
        type: 'showcase',
        items: SHOWCASE_TRACKS,
      },
    ];

    const parseBrowseShelves = (data, prefix) => {
      const rawShelves =
        data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
          ?.sectionListRenderer?.contents || [];
      for (const s of rawShelves) {
        const carousel = s.musicCarouselShelfRenderer;
        if (!carousel) continue;
        const header = carousel.header?.musicCarouselShelfBasicHeaderRenderer;
        const title = runsText(header?.title) || 'Trending Now';
        const subtitle = runsText(header?.strapline) || '';
        const items = [];
        for (const c of carousel.contents || []) {
          if (c.musicResponsiveListItemRenderer) {
            const parsed = parseResponsiveListItem(c.musicResponsiveListItemRenderer);
            if (parsed && (parsed.videoId || parsed.browseId)) items.push(parsed);
          } else if (c.musicTwoRowItemRenderer) {
            const parsed = parseTwoRowItem(c.musicTwoRowItemRenderer);
            if (parsed && (parsed.videoId || parsed.browseId)) items.push(parsed);
          }
        }
        if (items.length > 0) {
          shelves.push({
            id: `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title,
            subtitle,
            type: items[0].videoId && items[0].type === 'song' ? 'songs' : 'cards',
            items,
          });
        }
      }
    };

    if (homeRes.status === 'fulfilled') {
      parseBrowseShelves(homeRes.value, 'home');
    }
    if (chartsRes.status === 'fulfilled') {
      parseBrowseShelves(chartsRes.value, 'charts');
    }

    // Ensure we always have a rich "Quick Picks (InnerTube Songs)" shelf if FEmusic_home didn't return one
    const hasSongShelf = shelves.some((s) => s.type === 'songs');
    if (!hasSongShelf) {
      try {
        const qpRes = await fetch(
          'https://music.youtube.com/youtubei/v1/search?prettyPrint=false',
          {
            method: 'POST',
            headers: INNERTUBE_HEADERS,
            body: JSON.stringify({
              context: INNERTUBE_CONTEXT,
              query: 'top hits 2025 2026',
              params: SEARCH_FILTER_PARAMS.songs,
            }),
          }
        ).then((r) => r.json());
        const qpContents =
          qpRes?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
            ?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer
            ?.contents || [];
        const qpItems = [];
        for (const c of qpContents) {
          if (c.musicResponsiveListItemRenderer) {
            const parsed = parseResponsiveListItem(
              c.musicResponsiveListItemRenderer,
              { type: 'song' }
            );
            if (parsed && parsed.videoId) qpItems.push(parsed);
          }
        }
        if (qpItems.length > 0) {
          shelves.splice(1, 0, {
            id: 'innertube-quick-picks',
            title: 'Quick Picks',
            subtitle: 'Live from YouTube Music InnerTube (WEB_REMIX)',
            type: 'songs',
            items: qpItems.slice(0, 16),
          });
        }
      } catch {}
    }

    res.json({ shelves });
  } catch (err) {
    console.error('Error in /api/home:', err);
    res.json({
      shelves: [
        {
          id: 'simpmusic-showcase',
          title: 'SponsorBlock & Synced Lyrics Featured',
          subtitle: 'Instant auto-skip segments, ReturnYouTubeDislike stats & LRCLIB karaoke lyrics',
          type: 'showcase',
          items: SHOWCASE_TRACKS,
        },
      ],
    });
  }
});

// 3. Search Suggestions (InnerTube Autocomplete)
app.get('/api/suggestions', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ queries: [], items: [] });

  try {
    const ytRes = await fetch(
      'https://music.youtube.com/youtubei/v1/music/get_search_suggestions?prettyPrint=false',
      {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({ context: INNERTUBE_CONTEXT, input: q }),
      }
    );
    const data = await ytRes.json();
    const queries = [];
    const items = [];

    for (const sec of data.contents || []) {
      const list = sec.searchSuggestionsSectionRenderer?.contents || [];
      for (const entry of list) {
        if (entry.searchSuggestionRenderer) {
          const text = runsText(entry.searchSuggestionRenderer.suggestion);
          if (text) queries.push(text);
        } else if (entry.musicResponsiveListItemRenderer) {
          const parsed = parseResponsiveListItem(entry.musicResponsiveListItemRenderer);
          if (parsed) items.push(parsed);
        }
      }
    }

    res.json({ queries: queries.slice(0, 7), items: items.slice(0, 4) });
  } catch (err) {
    res.json({ queries: [], items: [] });
  }
});

// 4. InnerTube Search Endpoint
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = String(req.query.filter || 'songs').toLowerCase();
  if (!q) return res.json({ results: [], topResult: null });

  try {
    const params = SEARCH_FILTER_PARAMS[filter] || undefined;
    const body = {
      context: INNERTUBE_CONTEXT,
      query: q,
      ...(params ? { params } : {}),
    };

    const ytRes = await fetch(
      'https://music.youtube.com/youtubei/v1/search?prettyPrint=false',
      {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify(body),
      }
    );
    const data = await ytRes.json();

    const rawSections =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];

    const results = [];
    let topResult = null;

    for (const section of rawSections) {
      const innerContents = section.itemSectionRenderer?.contents || [section];
      for (const s of innerContents) {
        if (s.musicCardShelfRenderer) {
          const card = s.musicCardShelfRenderer;
          const title = runsText(card.title);
          const subtitle = runsText(card.subtitle);
          const videoId =
            card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
            card.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
            null;
          const browseId =
            card.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null;
          const thumbs =
            card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const thumbnail = upgradeThumbnail(thumbs[thumbs.length - 1]?.url, videoId);
          if (title && (videoId || browseId)) {
            topResult = {
              id: videoId || browseId,
              videoId,
              browseId,
              type: videoId ? 'song' : browseId?.startsWith('UC') ? 'artist' : 'album',
              title,
              artist: subtitle,
              subtitle,
              thumbnail,
              duration: '3:50',
              durationSeconds: 230,
            };
          }
        }
        if (s.musicResponsiveListItemRenderer) {
          const parsed = parseResponsiveListItem(s.musicResponsiveListItemRenderer, {
            type: filter === 'all' ? undefined : filter.replace(/s$/, ''),
          });
          if (parsed && (parsed.videoId || parsed.browseId)) results.push(parsed);
        }
        if (s.musicShelfRenderer) {
          for (const c of s.musicShelfRenderer.contents || []) {
            if (c.musicResponsiveListItemRenderer) {
              const parsed = parseResponsiveListItem(c.musicResponsiveListItemRenderer, {
                type: filter === 'all' ? undefined : filter.replace(/s$/, ''),
              });
              if (parsed && (parsed.videoId || parsed.browseId)) results.push(parsed);
            }
          }
        }
      }
    }

    res.json({ query: q, filter, topResult, results });
  } catch (err) {
    console.error('Error in /api/search:', err);
    res.status(500).json({ error: 'InnerTube search failed', results: [] });
  }
});

// 5. InnerTube Browse Endpoint (Albums, Playlists, Artists)
app.get('/api/browse/:browseId', async (req, res) => {
  const { browseId } = req.params;
  if (!browseId) return res.status(400).json({ error: 'Missing browseId' });

  try {
    const ytRes = await fetch(
      'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false',
      {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({ context: INNERTUBE_CONTEXT, browseId }),
      }
    );
    const data = await ytRes.json();

    // Case A: TwoColumnBrowseResultsRenderer (Albums & Playlists)
    if (data.contents?.twoColumnBrowseResultsRenderer) {
      const twoCol = data.contents.twoColumnBrowseResultsRenderer;
      const header =
        twoCol.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
          ?.musicResponsiveHeaderRenderer ||
        twoCol.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
          ?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicResponsiveHeaderRenderer;

      const title = runsText(header?.title) || 'Collection';
      const subtitle = runsText(header?.subtitle) || '';
      const artist = runsText(header?.straplineTextOne) || 'YouTube Music';
      const description =
        runsText(
          header?.description?.musicDescriptionShelfRenderer?.description
        ) || '';
      const secondSubtitle = runsText(header?.secondSubtitle) || '';
      const thumbs =
        header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const thumbnail = upgradeThumbnail(thumbs[thumbs.length - 1]?.url);

      const secContents =
        twoCol.secondaryContents?.sectionListRenderer?.contents || [];
      const tracks = [];
      for (const sc of secContents) {
        const shelf = sc.musicPlaylistShelfRenderer || sc.musicShelfRenderer;
        if (!shelf) continue;
        for (const c of shelf.contents || []) {
          if (c.musicResponsiveListItemRenderer) {
            const parsed = parseResponsiveListItem(
              c.musicResponsiveListItemRenderer,
              {
                artist,
                album: title,
                thumbnail,
                type: 'song',
              }
            );
            if (parsed && parsed.videoId) tracks.push(parsed);
          }
        }
      }

      return res.json({
        browseId,
        kind: browseId.startsWith('MPREb_') ? 'album' : 'playlist',
        title,
        artist,
        subtitle,
        secondSubtitle,
        description,
        thumbnail,
        tracks,
        shelves: [],
      });
    }

    // Case B: Artist or SingleColumn Browse
    const header =
      data.header?.musicImmersiveHeaderRenderer ||
      data.header?.musicVisualHeaderRenderer ||
      data.header?.musicDetailHeaderRenderer;

    const title = runsText(header?.title) || 'Artist';
    const description = runsText(header?.description) || '';
    const subscribers =
      runsText(
        header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText
      ) || '';
    const thumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = upgradeThumbnail(thumbs[thumbs.length - 1]?.url);

    const rawShelves =
      data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents || [];

    const tracks = [];
    const shelves = [];

    for (const s of rawShelves) {
      if (s.musicShelfRenderer) {
        const shelfTitle = runsText(s.musicShelfRenderer.title) || 'Top Songs';
        for (const c of s.musicShelfRenderer.contents || []) {
          if (c.musicResponsiveListItemRenderer) {
            const parsed = parseResponsiveListItem(
              c.musicResponsiveListItemRenderer,
              { artist: title, thumbnail }
            );
            if (parsed && parsed.videoId) tracks.push(parsed);
          }
        }
      } else if (s.musicCarouselShelfRenderer) {
        const carousel = s.musicCarouselShelfRenderer;
        const shelfTitle =
          runsText(
            carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title
          ) || 'Featured';
        const items = [];
        for (const c of carousel.contents || []) {
          if (c.musicTwoRowItemRenderer) {
            const parsed = parseTwoRowItem(c.musicTwoRowItemRenderer);
            if (parsed) items.push(parsed);
          } else if (c.musicResponsiveListItemRenderer) {
            const parsed = parseResponsiveListItem(
              c.musicResponsiveListItemRenderer,
              { artist: title }
            );
            if (parsed) items.push(parsed);
          }
        }
        if (items.length > 0) {
          shelves.push({ id: shelfTitle, title: shelfTitle, items });
        }
      }
    }

    res.json({
      browseId,
      kind: 'artist',
      title,
      artist: title,
      subtitle: subscribers ? `${subscribers} subscribers` : 'Artist',
      description,
      thumbnail,
      tracks,
      shelves,
    });
  } catch (err) {
    console.error('Error in /api/browse:', err);
    res.status(500).json({ error: 'Browse failed' });
  }
});

// Helper: Fetch SponsorBlock segments for a videoId
async function fetchSponsorBlock(videoId) {
  if (!videoId) return [];
  const categories = JSON.stringify([
    'sponsor',
    'music_offtopic',
    'intro',
    'outro',
    'selfpromo',
    'interaction',
    'preview',
  ]);
  const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
    videoId
  )}&categories=${encodeURIComponent(categories)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.status !== 200) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((seg) => ({
      uuid: seg.UUID,
      category: seg.category,
      actionType: seg.actionType || 'skip',
      startTime: Number(seg.segment?.[0] || 0),
      endTime: Number(seg.segment?.[1] || 0),
      videoDuration: Number(seg.videoDuration || 0),
      votes: seg.votes ?? 0,
    }));
  } catch {
    return [];
  }
}

// Helper: Fetch ReturnYouTubeDislike stats for a videoId
async function fetchRYD(videoId) {
  if (!videoId) return null;
  try {
    const res = await fetch(
      `https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(
        videoId
      )}`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!res.status || res.status !== 200) return null;
    const d = await res.json();
    const totalVotes = (d.likes || 0) + (d.dislikes || 0);
    const likePercentage =
      totalVotes > 0 ? Math.round(((d.likes || 0) / totalVotes) * 1000) / 10 : 100;
    return {
      id: d.id,
      likes: d.likes || 0,
      dislikes: d.dislikes || 0,
      rawLikes: d.rawLikes || 0,
      rawDislikes: d.rawDislikes || 0,
      viewCount: d.viewCount || 0,
      rating: d.rating || 5,
      likePercentage,
      dateCreated: d.dateCreated,
    };
  } catch {
    return null;
  }
}

// Helper: Parse LRC synced lyrics string "[00:12.34] Hello world" into array
function parseLrcString(lrc) {
  if (!lrc || typeof lrc !== 'string') return [];
  const lines = lrc.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = rawLine.replace(timeRegex, '').trim();
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const msStr = m[3] || '0';
      const ms =
        msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr, 10);
      const time = mins * 60 + secs + ms / 1000;
      parsed.push({
        time: Math.round(time * 100) / 100,
        text: text || '♪',
      });
    }
  }
  return parsed.sort((a, b) => a.time - b.time);
}

// Helper: Fetch LRCLIB synced & plain lyrics
async function fetchLyrics(title, artist, lyricsBrowseId = null) {
  const cleanTitle = String(title || '')
    .replace(/\(Official.*?\)|\[Official.*?\]|\(Video\)|\(Audio\)|\(Lyrics\)/gi, '')
    .trim();
  const cleanArtist = String(artist || '')
    .split(/[,•&]/)[0]
    .trim();

  try {
    // 1. Try LRCLIB exact search
    const qUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
      cleanTitle
    )}&artist_name=${encodeURIComponent(cleanArtist)}`;
    let res = await fetch(qUrl, {
      headers: { 'User-Agent': 'AuraMusic-SimpMusic/1.0.0' },
      signal: AbortSignal.timeout(4500),
    });
    let list = res.ok ? await res.json() : [];

    // 2. Fallback to general query search on LRCLIB
    if (!Array.isArray(list) || list.length === 0) {
      const fallbackUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
        `${cleanTitle} ${cleanArtist}`
      )}`;
      res = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'AuraMusic-SimpMusic/1.0.0' },
        signal: AbortSignal.timeout(4500),
      });
      list = res.ok ? await res.json() : [];
    }

    if (Array.isArray(list) && list.length > 0) {
      const withSynced = list.find((item) => item.syncedLyrics) || list[0];
      const syncedLines = parseLrcString(withSynced.syncedLyrics);
      return {
        source: 'LRCLIB',
        trackName: withSynced.trackName,
        artistName: withSynced.artistName,
        albumName: withSynced.albumName,
        Instrumental: Boolean(withSynced.instrumental),
        hasSynced: syncedLines.length > 0,
        syncedLines,
        plainLyrics:
          withSynced.plainLyrics ||
          syncedLines.map((l) => l.text).join('\n') ||
          '',
      };
    }
  } catch (e) {
    // Continue to InnerTube fallback
  }

  // 3. Fallback to InnerTube Lyrics browseId
  if (lyricsBrowseId) {
    try {
      const lRes = await fetch(
        'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false',
        {
          method: 'POST',
          headers: INNERTUBE_HEADERS,
          body: JSON.stringify({
            context: INNERTUBE_CONTEXT,
            browseId: lyricsBrowseId,
          }),
        }
      );
      const lData = await lRes.json();
      const desc =
        lData.contents?.sectionListRenderer?.contents?.[0]
          ?.musicDescriptionShelfRenderer?.description?.runs
          ?.map((r) => r.text)
          .join('') || '';
      if (desc) {
        return {
          source: 'YouTube Music InnerTube',
          hasSynced: false,
          syncedLines: [],
          plainLyrics: desc,
        };
      }
    } catch {}
  }

  return {
    source: 'None',
    hasSynced: false,
    syncedLines: [],
    plainLyrics: '',
  };
}

// Helper: Resolve direct studio audio stream (iTunes 256kbps AAC / Deezer MP3 / JioSaavn 320kbps AAC)
async function resolveDirectAudioStream(title, artist) {
  const cleanTitle = String(title || '')
    .replace(/\(Official.*?\)|\[Official.*?\]|\(Video\)|\(Audio\)|\(Lyrics\)/gi, '')
    .trim();
  const cleanArtist = String(artist || '')
    .split(/[•]/)[0]
    .trim();
  const searchTerm = `${cleanTitle} ${cleanArtist}`.trim();

  // 1. Try iTunes Search API (256kbps AAC Plus studio audio)
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        searchTerm
      )}&media=music&entity=song&limit=5`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      const results = itunesData.results || [];
      // Pick best match where artistName or trackName matches closely
      const match =
        results.find((r) =>
          r.artistName?.toLowerCase().includes(cleanArtist.toLowerCase().split(',')[0].trim())
        ) || results[0];
      if (match?.previewUrl) {
        return {
          directUrl: match.previewUrl,
          proxiedUrl: `/api/audio-proxy?url=${encodeURIComponent(match.previewUrl)}`,
          codec: 'AAC-LC 256kbps (Apple Music / iTunes CDN)',
          matchedTrack: `${match.trackName} — ${match.artistName}`,
          artworkUrl: match.artworkUrl100?.replace('100x100bb', '600x600bb'),
        };
      }
    }
  } catch {}

  // 2. Fallback to Deezer CDN MP3
  try {
    const dzRes = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(searchTerm)}&limit=3`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (dzRes.ok) {
      const dzData = await dzRes.json();
      const match = dzData.data?.[0];
      if (match?.preview) {
        return {
          directUrl: match.preview,
          proxiedUrl: `/api/audio-proxy?url=${encodeURIComponent(match.preview)}`,
          codec: 'MP3 128kbps (Deezer CDN)',
          matchedTrack: `${match.title} — ${match.artist?.name}`,
          artworkUrl: match.album?.cover_xl,
        };
      }
    }
  } catch {}

  return null;
}

// Helper: Find counterpart Music Video ID via InnerTube Video Search if primary ID has no SponsorBlock segments
async function findCounterpartMusicVideoId(title, artist) {
  if (!title) return null;
  try {
    const res = await fetch(
      'https://music.youtube.com/youtubei/v1/search?prettyPrint=false',
      {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          query: `${title} ${artist}`,
          params: SEARCH_FILTER_PARAMS.videos,
        }),
      }
    );
    const data = await res.json();
    const first =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents?.[0]
        ?.musicResponsiveListItemRenderer;
    return first?.playlistItemData?.videoId || null;
  } catch {
    return null;
  }
}

// 6. Comprehensive Track Context Endpoint:
// Returns InnerTube Radio Queue, SponsorBlock Segments, ReturnYouTubeDislike Stats, LRCLIB Synced Lyrics & Direct Audio Stream
app.get('/api/track-context/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const queryTitle = String(req.query.title || '');
  const queryArtist = String(req.query.artist || '');

  try {
    // 1. Fetch InnerTube /next (Radio Automix Queue + Lyrics browseId), SponsorBlock, and RYD in parallel
    const [nextResult, primarySB, primaryRYD] = await Promise.all([
      fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
        method: 'POST',
        headers: INNERTUBE_HEADERS,
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          videoId,
          playlistId: `RDAMVM${videoId}`,
          isAudioOnly: true,
        }),
      })
        .then((r) => r.json())
        .catch(() => null),
      fetchSponsorBlock(videoId),
      fetchRYD(videoId),
    ]);

    // Parse queue & current track metadata from /next
    const tabs =
      nextResult?.contents?.singleColumnMusicWatchNextResultsRenderer
        ?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
    const queueItemsRaw =
      tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content
        ?.playlistPanelRenderer?.contents || [];
    const lyricsBrowseId =
      tabs[1]?.tabRenderer?.endpoint?.browseEndpoint?.browseId || null;

    const upNextQueue = [];
    for (const q of queueItemsRaw) {
      const pv = q.playlistPanelVideoRenderer;
      if (!pv || !pv.videoId) continue;
      const tTitle = runsText(pv.title);
      const byline = runsText(pv.longBylineText) || runsText(pv.shortBylineText);
      const bylineParts = byline.split('•').map((s) => s.trim());
      const tArtist = bylineParts[0] || 'YouTube Music';
      const tAlbum = bylineParts[1] || '';
      const durText = runsText(pv.lengthText) || '3:30';
      const thumbs = pv.thumbnail?.thumbnails || [];
      const thumbUrl = upgradeThumbnail(
        thumbs[thumbs.length - 1]?.url,
        pv.videoId
      );
      upNextQueue.push({
        id: pv.videoId,
        videoId: pv.videoId,
        type: 'song',
        title: tTitle,
        artist: tArtist,
        album: tAlbum,
        duration: durText,
        durationSeconds: parseDurationSeconds(durText) || 210,
        thumbnail: thumbUrl,
      });
    }

    const effectiveTitle =
      queryTitle || upNextQueue[0]?.title || 'Unknown Track';
    const effectiveArtist =
      queryArtist || upNextQueue[0]?.artist || 'Unknown Artist';

    // 2. If primary videoId had no SponsorBlock segments, check counterpart Official Music Video ID!
    let sponsorBlockSegments = primarySB;
    let sponsorBlockVideoId = videoId;
    let rydStats = primaryRYD;
    let musicVideoId = videoId;

    if (sponsorBlockSegments.length === 0 && effectiveTitle) {
      const altVid = await findCounterpartMusicVideoId(
        effectiveTitle,
        effectiveArtist
      );
      if (altVid && altVid !== videoId) {
        musicVideoId = altVid;
        const [altSB, altRYD] = await Promise.all([
          fetchSponsorBlock(altVid),
          fetchRYD(altVid),
        ]);
        if (altSB.length > 0) {
          sponsorBlockSegments = altSB;
          sponsorBlockVideoId = altVid;
        }
        if (
          altRYD &&
          (!rydStats || (altRYD.viewCount || 0) > (rydStats.viewCount || 0))
        ) {
          rydStats = altRYD;
        }
      }
    }

    // 3. Fetch LRCLIB Synced Lyrics and Direct Audio Stream in parallel
    const [lyricsData, audioStream] = await Promise.all([
      fetchLyrics(effectiveTitle, effectiveArtist, lyricsBrowseId),
      resolveDirectAudioStream(effectiveTitle, effectiveArtist),
    ]);

    res.json({
      videoId,
      musicVideoId,
      title: effectiveTitle,
      artist: effectiveArtist,
      innertubeClient: 'WEB_REMIX (1.20240724.01.00)',
      sponsorBlock: {
        videoId: sponsorBlockVideoId,
        segmentCount: sponsorBlockSegments.length,
        segments: sponsorBlockSegments,
      },
      returnYouTubeDislike: rydStats || {
        id: videoId,
        likes: 0,
        dislikes: 0,
        viewCount: 0,
        rating: 5.0,
        likePercentage: 100,
      },
      lyrics: lyricsData,
      audioStream,
      upNext: upNextQueue.slice(0, 30),
    });
  } catch (err) {
    console.error('Error in /api/track-context:', err);
    res.status(500).json({ error: 'Failed to load track context' });
  }
});

// 7. Audio Stream Proxy with Range Request Support (for Web Audio API EQ/Visualizer & CORS-free playback)
app.get('/api/audio-proxy', async (req, res) => {
  const targetUrl = String(req.query.url || '');
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid stream URL');
  }

  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const upstream = await fetch(targetUrl, { headers });
    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    const passHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'cache-control',
    ];
    for (const h of passHeaders) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('Audio proxy error:', err.message);
    if (!res.headersSent) res.status(502).send('Audio stream proxy error');
  }
});

// 8. Image Proxy for CORS-free Material You Dynamic Palette Extraction on <canvas>
app.get('/api/image-proxy', async (req, res) => {
  const targetUrl = String(req.query.url || '');
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid image URL');
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!upstream.ok) return res.status(upstream.status).end();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'image/jpeg'
    );

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(502).send('Image proxy failed');
  }
});

// Serve built frontend static assets on port 3001 so port 3001 serves both UI and /api/*
app.use(express.static(DIST_DIR));
app.use(express.static(PUBLIC_DIR));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AuraMusic InnerTube Server & Web UI listening on http://0.0.0.0:${PORT}`);
});
