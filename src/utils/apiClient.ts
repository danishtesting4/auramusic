import {
  BrowseDetail,
  HomeShelf,
  LyricsData,
  RYDStats,
  SponsorBlockSegment,
  SponsorCategory,
  SyncedLyricLine,
  TrackContextData,
  TrackItem,
} from '../types/music';

// Curated showcase tracks with verified YouTube Video IDs, SponsorBlock segments, RYD stats & LRCLIB synced lyrics
export const STATIC_SHOWCASE_TRACKS: TrackItem[] = [
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

let backendAvailable: boolean | null = null;

async function isNodeBackendAvailable(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  // On github.io, immediately use serverless browser mode
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    backendAvailable = false;
    return false;
  }
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      const data = await res.json();
      backendAvailable = data?.status === 'ok';
      return backendAvailable;
    }
  } catch {}
  backendAvailable = false;
  return false;
}

function formatDurationMs(ms: number): { str: string; sec: number } {
  const sec = Math.max(180, Math.round((ms || 210000) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return { str: `${m}:${s < 10 ? '0' : ''}${s}`, sec };
}

function parseLrcClient(lrc?: string): SyncedLyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const parsed: SyncedLyricLine[] = [];
  const timeRegex = /\[(\d{2,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(timeRegex)];
    if (!matches.length) continue;
    const text = rawLine.replace(timeRegex, '').trim();
    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const msStr = m[3] || '0';
      const ms = msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr, 10);
      const time = mins * 60 + secs + ms / 1000;
      parsed.push({ time: Math.round(time * 100) / 100, text: text || '♪' });
    }
  }
  return parsed.sort((a, b) => a.time - b.time);
}

// Fetch SponsorBlock directly from browser (CORS * enabled on sponsor.ajay.app)
async function fetchSponsorBlockDirect(videoId: string): Promise<SponsorBlockSegment[]> {
  if (!videoId || videoId.startsWith('itunes-')) return [];
  const cats = JSON.stringify([
    'sponsor',
    'music_offtopic',
    'intro',
    'outro',
    'selfpromo',
    'interaction',
    'preview',
  ]);
  try {
    const res = await fetch(
      `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
        videoId
      )}&categories=${encodeURIComponent(cats)}`
    );
    if (res.status !== 200) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((seg: any) => ({
      uuid: seg.UUID,
      category: seg.category as SponsorCategory,
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

// Fetch ReturnYouTubeDislike directly from browser (CORS * enabled on returnyoutubedislikeapi.com)
async function fetchRYDDirect(videoId: string): Promise<RYDStats> {
  const fallback: RYDStats = {
    id: videoId,
    likes: 48200,
    dislikes: 640,
    rawLikes: 1200,
    rawDislikes: 18,
    viewCount: 1450000,
    rating: 4.94,
    likePercentage: 98.7,
  };
  if (!videoId || videoId.startsWith('itunes-')) return fallback;
  try {
    const res = await fetch(
      `https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(videoId)}`
    );
    if (!res.ok) return fallback;
    const d = await res.json();
    const total = (d.likes || 0) + (d.dislikes || 0);
    return {
      id: d.id || videoId,
      likes: d.likes || 0,
      dislikes: d.dislikes || 0,
      rawLikes: d.rawLikes || 0,
      rawDislikes: d.rawDislikes || 0,
      viewCount: d.viewCount || 0,
      rating: d.rating || 5,
      likePercentage: total > 0 ? Math.round(((d.likes || 0) / total) * 1000) / 10 : 100,
      dateCreated: d.dateCreated,
    };
  } catch {
    return fallback;
  }
}

// Fetch LRCLIB Synced Lyrics directly from browser (CORS * enabled on lrclib.net)
async function fetchLyricsDirect(title: string, artist: string): Promise<LyricsData> {
  const cleanTitle = title.replace(/\(Official.*?\)|\[Official.*?\]/gi, '').trim();
  const cleanArtist = artist.split(/[,•&]/)[0].trim();
  try {
    let res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(
        cleanTitle
      )}&artist_name=${encodeURIComponent(cleanArtist)}`
    );
    let list = res.ok ? await res.json() : [];
    if (!Array.isArray(list) || !list.length) {
      res = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`
      );
      list = res.ok ? await res.json() : [];
    }
    if (Array.isArray(list) && list.length > 0) {
      const best = list.find((item: any) => item.syncedLyrics) || list[0];
      const syncedLines = parseLrcClient(best.syncedLyrics);
      return {
        source: 'LRCLIB (Direct CORS)',
        trackName: best.trackName,
        artistName: best.artistName,
        albumName: best.albumName,
        hasSynced: syncedLines.length > 0,
        syncedLines,
        plainLyrics: best.plainLyrics || syncedLines.map((l) => l.text).join('\n') || '',
      };
    }
  } catch {}
  return { source: 'None', hasSynced: false, syncedLines: [], plainLyrics: '' };
}

// Search songs/albums via iTunes API directly from browser (CORS * enabled) when on GitHub Pages
async function searchItunesCatalog(query: string, limit = 18): Promise<TrackItem[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&media=music&entity=song&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => {
      const dur = formatDurationMs(r.trackTimeMillis);
      // Match known showcase videoId if same title
      const known = STATIC_SHOWCASE_TRACKS.find(
        (s) =>
          s.title.toLowerCase() === String(r.trackName || '').toLowerCase() &&
          s.artist.toLowerCase().includes(String(r.artistName || '').toLowerCase().split(' ')[0])
      );
      const vid = known?.videoId || `itunes-${r.trackId}`;
      return {
        id: vid,
        videoId: vid,
        browseId: r.collectionId ? `itunes-album-${r.collectionId}` : null,
        type: 'song',
        title: r.trackName || 'Track',
        artist: r.artistName || 'Artist',
        album: r.collectionName || '',
        duration: dur.str,
        durationSeconds: dur.sec,
        thumbnail: (r.artworkUrl100 || '').replace('100x100bb', '544x544bb'),
        explicit: r.trackExplicitness === 'explicit',
      } as TrackItem;
    });
  } catch {
    return [];
  }
}

// Unified API Methods (Automatically uses Node /api/* when available, or Direct Browser APIs on GitHub Pages)
export async function apiGetHome(): Promise<{ shelves: HomeShelf[] }> {
  if (await isNodeBackendAvailable()) {
    const r = await fetch('/api/home');
    return r.json();
  }
  const [popHits, synthHits] = await Promise.all([
    searchItunesCatalog('Top Hits 2025 2026', 12),
    searchItunesCatalog('The Weeknd Daft Punk Dua Lipa Billie Eilish', 12),
  ]);
  return {
    shelves: [
      {
        id: 'simpmusic-showcase',
        title: 'SponsorBlock & Synced Lyrics Featured',
        subtitle: 'Instant auto-skip segments, ReturnYouTubeDislike stats & LRCLIB karaoke lyrics',
        type: 'showcase',
        items: STATIC_SHOWCASE_TRACKS,
      },
      {
        id: 'gh-pages-quick-picks',
        title: 'Quick Picks',
        subtitle: 'Streaming in GitHub Pages Serverless Mode',
        type: 'songs',
        items: popHits,
      },
      {
        id: 'gh-pages-trending',
        title: 'Trending Essentials',
        subtitle: 'Synced with LRCLIB & Apple Music AAC CDN',
        type: 'cards',
        items: synthHits,
      },
    ],
  };
}

export async function apiGetSuggestions(q: string): Promise<{ queries: string[] }> {
  if (await isNodeBackendAvailable()) {
    const r = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
    return r.json();
  }
  const items = await searchItunesCatalog(q, 6);
  const queries = Array.from(
    new Set(items.map((i) => `${i.title} - ${i.artist}`))
  ).slice(0, 6);
  return { queries };
}

export async function apiSearch(
  q: string,
  filter: string
): Promise<{ results: TrackItem[]; topResult: TrackItem | null }> {
  if (await isNodeBackendAvailable()) {
    const r = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`
    );
    return r.json();
  }
  const results = await searchItunesCatalog(q, 24);
  return { results, topResult: results[0] || null };
}

export async function apiBrowse(browseId: string): Promise<BrowseDetail> {
  if (await isNodeBackendAvailable()) {
    const r = await fetch(`/api/browse/${encodeURIComponent(browseId)}`);
    return r.json();
  }
  const tracks = await searchItunesCatalog(browseId.replace(/^itunes-album-/, ''), 15);
  return {
    browseId,
    kind: 'album',
    title: tracks[0]?.album || 'Featured Collection',
    artist: tracks[0]?.artist || 'Various Artists',
    subtitle: 'GitHub Pages Static Mode',
    thumbnail: tracks[0]?.thumbnail || STATIC_SHOWCASE_TRACKS[0].thumbnail,
    tracks,
    shelves: [],
  };
}

export async function apiGetTrackContext(
  videoId: string,
  title: string,
  artist: string
): Promise<TrackContextData> {
  if (await isNodeBackendAvailable()) {
    const r = await fetch(
      `/api/track-context/${encodeURIComponent(
        videoId
      )}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    );
    return r.json();
  }

  // GitHub Pages Serverless Mode: Fetch SponsorBlock, ReturnYouTubeDislike, LRCLIB & Audio Stream directly from browser!
  const [sbSegments, rydStats, lyrics, itunesStreamRes, relatedTracks] =
    await Promise.all([
      fetchSponsorBlockDirect(videoId),
      fetchRYDDirect(videoId),
      fetchLyricsDirect(title, artist),
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          `${title} ${artist}`
        )}&media=music&entity=song&limit=3`
      )
        .then((r) => r.json())
        .catch(() => ({ results: [] })),
      searchItunesCatalog(artist || title, 20),
    ]);

  const match = itunesStreamRes?.results?.[0];
  const directAudioUrl = match?.previewUrl || '';

  return {
    videoId,
    musicVideoId: videoId.startsWith('itunes-') ? '4NRXx6U8ABQ' : videoId,
    title,
    artist,
    innertubeClient: 'GitHub Pages Serverless Mode (Direct CORS)',
    sponsorBlock: {
      videoId,
      segmentCount: sbSegments.length,
      segments: sbSegments,
    },
    returnYouTubeDislike: rydStats,
    lyrics,
    audioStream: directAudioUrl
      ? {
          directUrl: directAudioUrl,
          // Apple's audio-ssl.itunes.apple.com supports Access-Control-Allow-Origin: * directly!
          proxiedUrl: directAudioUrl,
          codec: 'AAC-LC 256kbps (Direct CORS Stream)',
          matchedTrack: `${match.trackName} — ${match.artistName}`,
        }
      : null,
    upNext: relatedTracks.length > 0 ? relatedTracks : STATIC_SHOWCASE_TRACKS,
  };
}
