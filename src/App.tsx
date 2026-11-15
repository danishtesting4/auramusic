import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Home,
  Compass,
  Library,
  Search,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Mic2,
  ListMusic,
  Maximize2,
  Plus,
  Sparkles,
  Settings,
  Radio,
  Disc3,
  Tv,
  FastForward,
  Undo2,
  CheckCircle2,
  Clock,
  FolderPlus,
  Trash2,
  Music,
} from 'lucide-react';
import {
  BrowseDetail,
  CustomPlaylist,
  HomeShelf,
  PlaybackEngineMode,
  SponsorBehavior,
  SponsorBlockSegment,
  SponsorCategory,
  SponsorCategorySetting,
  TrackContextData,
  TrackItem,
} from './types/music';
import {
  applyMaterialYouSeedHue,
  DEFAULT_SPONSORBLOCK_SETTINGS,
  extractSeedHueFromImage,
  formatCompactNumber,
  formatSeconds,
} from './utils/materialYou';
import {
  apiBrowse,
  apiGetHome,
  apiGetSuggestions,
  apiGetTrackContext,
  apiSearch,
} from './utils/apiClient';
import { SeekbarWithSponsorBlock } from './components/SeekbarWithSponsorBlock';
import { DrawerTab, RightDrawerPanel } from './components/RightDrawerPanel';
import { BrowseDetailView } from './components/BrowseDetailView';
import { ExpandedPlayerOverlay } from './components/ExpandedPlayerOverlay';
import { SettingsAndCrossPlatformModal } from './components/SettingsAndCrossPlatformModal';

type NavSection = 'home' | 'explore' | 'search' | 'library' | 'browse_detail';
type SearchFilter = 'songs' | 'videos' | 'albums' | 'artists' | 'playlists';

interface SkipToastInfo {
  segment: SponsorBlockSegment;
  previousTime: number;
  label: string;
}

export function App() {
  // Navigation & View State
  const [activeNav, setActiveNav] = useState<NavSection>('home');
  const [previousNav, setPreviousNav] = useState<NavSection>('home');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('lyrics');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Home & Explore Data
  const [homeShelves, setHomeShelves] = useState<HomeShelf[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('songs');
  const [searchResults, setSearchResults] = useState<TrackItem[]>([]);
  const [searchTopResult, setSearchTopResult] = useState<TrackItem | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Browse Detail State (Album / Playlist / Artist)
  const [browseDetail, setBrowseDetail] = useState<BrowseDetail | null>(null);
  const [isLoadingBrowse, setIsLoadingBrowse] = useState(false);

  // Player & Track Context State
  const [currentTrack, setCurrentTrack] = useState<TrackItem | null>(null);
  const [trackContext, setTrackContext] = useState<TrackContextData | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [queue, setQueue] = useState<TrackItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(210);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [engineMode, setEngineMode] = useState<PlaybackEngineMode>('direct_audio');
  const [lyricsOffset, setLyricsOffset] = useState(0);

  // Material You Theme State
  const [selectedThemeId, setSelectedThemeId] = useState<string>('dynamic');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);

  // SponsorBlock State & Telemetry
  const [categorySettings, setCategorySettings] = useState<
    Record<SponsorCategory, SponsorCategorySetting>
  >(() => {
    try {
      const saved = localStorage.getItem('auramusic_sb_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SPONSORBLOCK_SETTINGS;
    } catch {
      return DEFAULT_SPONSORBLOCK_SETTINGS;
    }
  });
  const [skippedCount, setSkippedCount] = useState<number>(() =>
    Number(localStorage.getItem('auramusic_sb_skipped') || 0)
  );
  const [timeSavedSeconds, setTimeSavedSeconds] = useState<number>(() =>
    Number(localStorage.getItem('auramusic_sb_saved') || 0)
  );
  const [skipToast, setSkipToast] = useState<SkipToastInfo | null>(null);
  const [activeManualSegment, setActiveManualSegment] =
    useState<SponsorBlockSegment | null>(null);
  const recentlySkippedUuidsRef = useRef<Set<string>>(new Set());

  // Library State (Liked Songs, Recently Played, Custom Playlists)
  const [likedSongs, setLikedSongs] = useState<TrackItem[]>(() => {
    try {
      const s = localStorage.getItem('auramusic_liked');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState<TrackItem[]>(() => {
    try {
      const s = localStorage.getItem('auramusic_recent');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>(() => {
    try {
      const s = localStorage.getItem('auramusic_playlists');
      if (s) return JSON.parse(s);
    } catch {}
    return [
      {
        id: 'pl-synthwave',
        name: 'Late Night Synth & Vibes',
        description: 'SponsorBlock-clean late night essentials',
        createdAt: Date.now(),
        tracks: [],
      },
    ];
  });
  const [selectedLibraryTab, setSelectedLibraryTab] = useState<
    'liked' | 'recent' | 'playlists'
  >('liked');
  const [playlistModalTrack, setPlaylistModalTrack] =
    useState<TrackItem | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Audio Element & Virtual Timeline Timer Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef<number>(0);

  // Persist Library & SponsorBlock stats
  useEffect(() => {
    localStorage.setItem('auramusic_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('auramusic_recent', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('auramusic_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem(
      'auramusic_sb_settings',
      JSON.stringify(categorySettings)
    );
  }, [categorySettings]);

  // Load Initial Home Feed & Auto-Load First Track Context
  useEffect(() => {
    let mounted = true;
    setIsLoadingHome(true);
    apiGetHome()
      .then((data) => {
        if (!mounted) return;
        const shelves: HomeShelf[] = data.shelves || [];
        setHomeShelves(shelves);
        setIsLoadingHome(false);

        // Pre-populate initial track (Blinding Lights with 2 SponsorBlock segments + 41 LRCLIB synced lyrics) without auto-blasting audio
        const firstShowcase = shelves[0]?.items?.[0];
        if (firstShowcase && !currentTrack) {
          loadTrack(firstShowcase, shelves[0].items, false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoadingHome(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Dynamic Material You Palette Extraction when Track or Theme changes
  useEffect(() => {
    if (selectedThemeId !== 'dynamic') return;
    if (!currentTrack?.thumbnail) return;
    extractSeedHueFromImage(currentTrack.thumbnail).then((hue) => {
      if (hue !== null) {
        applyMaterialYouSeedHue(hue);
      }
    });
  }, [currentTrack?.thumbnail, selectedThemeId]);

  // Core Function: Load & Optionally Play a Track
  const loadTrack = useCallback(
    async (
      track: TrackItem,
      customQueue?: TrackItem[],
      autoPlay = true
    ) => {
      if (!track.videoId && track.browseId) {
        handleBrowseItem(track.browseId);
        return;
      }

      setCurrentTrack(track);
      setCurrentTime(0);
      currentTimeRef.current = 0;
      const initialDur = track.durationSeconds || 220;
      setDuration(initialDur);
      recentlySkippedUuidsRef.current.clear();
      setActiveManualSegment(null);
      setIsLoadingContext(true);

      if (customQueue && customQueue.length > 0) {
        setQueue(customQueue);
      }

      // Add to Recently Played
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((t) => t.videoId !== track.videoId);
        return [track, ...filtered].slice(0, 30);
      });

      // Update OS MediaSession metadata
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'AuraMusic InnerTube',
          artwork: track.thumbnail
            ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
            : [],
        });
      }

      try {
        const ctxData: TrackContextData = await apiGetTrackContext(
          track.videoId || '',
          track.title,
          track.artist
        );
        setTrackContext(ctxData);
        setIsLoadingContext(false);

        // If SponsorBlock returned videoDuration, sync our full track duration to match SponsorBlock & Lyrics
        const sbDur = ctxData.sponsorBlock?.segments?.[0]?.videoDuration;
        if (sbDur && sbDur > 30) {
          setDuration(Math.round(sbDur));
        }

        if (!customQueue && ctxData.upNext?.length > 0) {
          setQueue(ctxData.upNext);
        }

        // Load studio audio stream into <audio> element
        if (audioRef.current && ctxData.audioStream?.proxiedUrl) {
          audioRef.current.src = ctxData.audioStream.proxiedUrl;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.volume = isMuted ? 0 : volume;
          if (autoPlay) {
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(true));
          } else {
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(autoPlay);
        }
      } catch (err) {
        setIsLoadingContext(false);
        setIsPlaying(autoPlay);
      }
    },
    [playbackRate, isMuted, volume]
  );

  // Next / Prev Track Handlers
  const handleNextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      loadTrack(queue[randomIdx], queue, true);
      return;
    }
    const idx = queue.findIndex((t) => t.videoId === currentTrack.videoId);
    if (idx >= 0 && idx + 1 < queue.length) {
      loadTrack(queue[idx + 1], queue, true);
    } else if (repeatMode === 'all' && queue.length > 0) {
      loadTrack(queue[0], queue, true);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, queue, isShuffle, repeatMode, loadTrack]);

  const handlePrevTrack = useCallback(() => {
    if (currentTimeRef.current > 4) {
      handleSeek(0);
      return;
    }
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.videoId === currentTrack.videoId);
    if (idx > 0) {
      loadTrack(queue[idx - 1], queue, true);
    } else {
      handleSeek(0);
    }
  }, [currentTrack, queue, loadTrack]);

  // Execute a SponsorBlock Skip
  const executeSponsorSkip = useCallback(
    (seg: SponsorBlockSegment) => {
      const prevTime = currentTimeRef.current;
      const targetTime = Math.min(duration, seg.endTime + 0.15);
      const saved = Math.max(1, Math.round(seg.endTime - prevTime));

      recentlySkippedUuidsRef.current.add(
        seg.uuid || `${seg.category}-${seg.startTime}`
      );
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);

      // Update SponsorBlock telemetry
      setSkippedCount((prev) => {
        const next = prev + 1;
        localStorage.setItem('auramusic_sb_skipped', String(next));
        return next;
      });
      setTimeSavedSeconds((prev) => {
        const next = prev + saved;
        localStorage.setItem('auramusic_sb_saved', String(next));
        return next;
      });

      const label =
        categorySettings[seg.category]?.label || seg.category;
      setSkipToast({
        segment: seg,
        previousTime: prevTime,
        label,
      });
      setActiveManualSegment(null);
    },
    [duration, categorySettings]
  );

  // Full-Track Timeline Ticker & SponsorBlock Real-Time Segment Matcher
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 200;
    const timer = setInterval(() => {
      const delta = (intervalMs / 1000) * playbackRate;
      const nextTime = currentTimeRef.current + delta;

      if (nextTime >= duration) {
        if (repeatMode === 'one') {
          currentTimeRef.current = 0;
          setCurrentTime(0);
          recentlySkippedUuidsRef.current.clear();
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        } else {
          handleNextTrack();
        }
        return;
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      // Check SponsorBlock segments at nextTime
      const segments = trackContext?.sponsorBlock?.segments || [];
      let foundManual: SponsorBlockSegment | null = null;

      for (const seg of segments) {
        const key = seg.uuid || `${seg.category}-${seg.startTime}`;
        const rule =
          categorySettings[seg.category]?.behavior || 'autoskip';
        if (rule === 'off' || rule === 'seekbar') continue;

        if (nextTime >= seg.startTime && nextTime < seg.endTime - 0.3) {
          if (
            rule === 'autoskip' &&
            !recentlySkippedUuidsRef.current.has(key)
          ) {
            executeSponsorSkip(seg);
            break;
          } else if (rule === 'manual') {
            foundManual = seg;
          }
        }
      }
      setActiveManualSegment(foundManual);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isPlaying,
    playbackRate,
    duration,
    repeatMode,
    trackContext,
    categorySettings,
    executeSponsorSkip,
    handleNextTrack,
  ]);

  // Auto-hide SponsorBlock toast after 5 seconds
  useEffect(() => {
    if (!skipToast) return;
    const t = setTimeout(() => setSkipToast(null), 5000);
    return () => clearTimeout(t);
  }, [skipToast]);

  // Seek Handler
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);

    // Clear skipped flags for segments ahead of clamped time so testing/rewinding re-triggers auto-skip!
    const segments = trackContext?.sponsorBlock?.segments || [];
    for (const seg of segments) {
      if (clamped <= seg.startTime + 0.5) {
        recentlySkippedUuidsRef.current.delete(
          seg.uuid || `${seg.category}-${seg.startTime}`
        );
      }
    }

    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime =
        clamped % Math.max(1, audioRef.current.duration);
    }
  };

  // Test SponsorBlock Segment Skip (jumps to 1.2s before segment start (or 0s if segment starts at 0) and plays)
  const handleTestSegmentSkip = (seg: SponsorBlockSegment) => {
    const key = seg.uuid || `${seg.category}-${seg.startTime}`;
    recentlySkippedUuidsRef.current.delete(key);
    const jumpTo = Math.max(0, seg.startTime - 1.2);
    currentTimeRef.current = jumpTo;
    setCurrentTime(jumpTo);
    if (!isPlaying) {
      setIsPlaying(true);
      if (audioRef.current && engineMode === 'direct_audio') {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Undo SponsorBlock Skip
  const handleUndoSkip = () => {
    if (!skipToast) return;
    const { segment, previousTime } = skipToast;
    const key = segment.uuid || `${segment.category}-${segment.startTime}`;
    // Keep it in recentlySkippedUuidsRef so it doesn't immediately re-skip when undone
    recentlySkippedUuidsRef.current.add(key);
    currentTimeRef.current = previousTime;
    setCurrentTime(previousTime);
    setSkipToast(null);
  };

  // Play / Pause Toggle
  const handleTogglePlay = () => {
    if (!currentTrack) return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (audioRef.current) {
      if (nextState && engineMode === 'direct_audio') {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  // Volume & Playback Rate sync with <audio>
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleChangeEngineMode = (mode: PlaybackEngineMode) => {
    setEngineMode(mode);
    if (mode === 'youtube_embed' && audioRef.current) {
      audioRef.current.pause();
    } else if (mode === 'direct_audio' && isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // Search Suggestions Debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      apiGetSuggestions(q)
        .then((d) => setSuggestions(d.queries || []))
        .catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute InnerTube Search
  const executeSearch = async (
    queryOverride?: string,
    filterOverride?: SearchFilter
  ) => {
    const q = (queryOverride ?? searchQuery).trim();
    const f = filterOverride ?? searchFilter;
    if (!q) return;

    setShowSuggestions(false);
    setActiveNav('search');
    setIsSearching(true);

    try {
      const data = await apiSearch(q, f);
      setSearchResults(data.results || []);
      setSearchTopResult(data.topResult || null);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Browse Album / Playlist / Artist via InnerTube
  const handleBrowseItem = async (browseId: string) => {
    setPreviousNav(activeNav === 'browse_detail' ? 'home' : activeNav);
    setActiveNav('browse_detail');
    setIsLoadingBrowse(true);
    try {
      const data: BrowseDetail = await apiBrowse(browseId);
      setBrowseDetail(data);
    } catch {
      setBrowseDetail(null);
    } finally {
      setIsLoadingBrowse(false);
    }
  };

  // Liked Songs Helpers
  const isTrackLiked = (videoId?: string | null) => {
    if (!videoId) return false;
    return likedSongs.some((t) => t.videoId === videoId);
  };

  const handleToggleLike = (track: TrackItem) => {
    if (!track.videoId) return;
    setLikedSongs((prev) => {
      const exists = prev.some((t) => t.videoId === track.videoId);
      if (exists) return prev.filter((t) => t.videoId !== track.videoId);
      return [track, ...prev];
    });
  };

  // Custom Playlist Management
  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const newPl: CustomPlaylist = {
      id: `pl-${Date.now()}`,
      name,
      description: 'Custom AuraMusic Playlist',
      createdAt: Date.now(),
      tracks: playlistModalTrack ? [playlistModalTrack] : [],
    };
    setPlaylists((prev) => [newPl, ...prev]);
    setNewPlaylistName('');
    setPlaylistModalTrack(null);
  };

  const handleAddTrackToExistingPlaylist = (
    playlistId: string,
    track: TrackItem
  ) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.videoId === track.videoId)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      })
    );
    setPlaylistModalTrack(null);
  };

  const handleSaveQueueAsPlaylist = () => {
    if (queue.length === 0) return;
    const newPl: CustomPlaylist = {
      id: `pl-${Date.now()}`,
      name: `${currentTrack?.title || 'Radio'} Automix`,
      description: `Saved from InnerTube RDAMVM Queue (${queue.length} tracks)`,
      createdAt: Date.now(),
      tracks: [...queue],
    };
    setPlaylists((prev) => [newPl, ...prev]);
    setActiveNav('library');
    setSelectedLibraryTab('playlists');
  };

  // Export & Import JSON Backup
  const handleExportBackup = () => {
    const backup = {
      app: 'AuraMusic-SimpMusic',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      likedSongs,
      playlists,
      sponsorBlockSettings: categorySettings,
      stats: { skippedCount, timeSavedSeconds },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auramusic-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.likedSongs)) setLikedSongs(parsed.likedSongs);
        if (Array.isArray(parsed.playlists)) setPlaylists(parsed.playlists);
        if (parsed.sponsorBlockSettings)
          setCategorySettings(parsed.sponsorBlockSettings);
      } catch {}
    };
    reader.readAsText(file);
  };

  const segments = trackContext?.sponsorBlock?.segments || [];
  const ryd = trackContext?.returnYouTubeDislike;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-md-surface text-md-on-surface select-none">
      {/* Hidden HTML5 Audio Engine (loops studio stream seamlessly while full-track timeline runs) */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        loop
        onEnded={() => {
          if (audioRef.current && isPlaying && engineMode === 'direct_audio') {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }}
      />

      {/* Top App Bar with InnerTube Search & Status Badges */}
      <header className="h-16 px-4 md:px-6 border-b border-md-outline-variant/25 bg-md-surface-container-low/90 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Brand Identity */}
        <div
          onClick={() => setActiveNav('home')}
          className="flex items-center gap-3 cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-m3-lg bg-gradient-to-br from-md-primary to-md-tertiary flex items-center justify-center shadow-md">
            <Disc3 className="w-6 h-6 text-md-on-primary animate-spin-slow" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-md-on-surface">
                AuraMusic
              </span>
              <span className="px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container text-[10px] font-extrabold uppercase tracking-wider">
                SimpMusic M3
              </span>
            </div>
            <p className="text-[11px] text-md-on-surface-variant font-medium">
              InnerTube • SponsorBlock • RYD • LRCLIB
            </p>
          </div>
        </div>

        {/* Center InnerTube Search Bar with Autocomplete Dropdown */}
        <div className="relative flex-1 max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
            }}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-md-on-surface-variant absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search YouTube Music songs, artists, albums, videos..."
              className="w-full pl-11 pr-24 py-2.5 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest focus:bg-md-surface-container-highest text-xs md:text-sm font-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 border border-md-outline-variant/30 focus:border-md-primary focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="submit"
                className="absolute right-2 px-3 py-1 rounded-full bg-md-primary text-md-on-primary text-xs font-bold hover:opacity-90"
              >
                Search
              </button>
            )}
          </form>

          {/* InnerTube Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 rounded-m3-lg bg-md-surface-container-highest border border-md-outline-variant/40 shadow-2xl py-1.5 z-50 overflow-hidden">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onMouseDown={() => {
                    setSearchQuery(sug);
                    executeSearch(sug);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-md-on-surface hover:bg-md-primary-container/40 flex items-center gap-2.5"
                >
                  <Search className="w-3.5 h-3.5 text-md-primary" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Status Pills & Theme/Settings Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            onClick={() => setDrawerTab('sponsorblock')}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-md-surface-container-high border border-md-outline-variant/30 text-xs font-semibold cursor-pointer hover:border-md-primary/50 transition-colors"
            title="SponsorBlock segments skipped this session"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-md-on-surface-variant">SponsorBlock:</span>
            <span className="font-mono-num font-bold text-md-primary">
              {skippedCount} skipped
            </span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-colors flex items-center gap-1.5"
            title="Material You Theme, Sleep Timer & Cross-Platform Settings"
          >
            <Settings className="w-4 h-4 text-md-primary" />
            <span className="hidden md:inline text-xs font-bold pr-1">
              Material You
            </span>
          </button>
        </div>
      </header>

      {/* Middle Workspace: Left Navigation Rail + Center Content + Right SimpMusic Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Material 3 Navigation Rail */}
        <nav className="hidden md:flex flex-col items-center w-20 py-5 px-2 bg-md-surface-container-low border-r border-md-outline-variant/25 justify-between shrink-0">
          <div className="space-y-4 w-full">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'explore', label: 'Charts', icon: Compass },
              { id: 'search', label: 'Search', icon: Search },
              { id: 'library', label: 'Library', icon: Library },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id as NavSection)}
                  className="w-full flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                      active
                        ? 'bg-md-primary-container text-md-on-primary-container shadow-sm'
                        : 'text-md-on-surface-variant group-hover:bg-md-surface-container-high group-hover:text-md-on-surface'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      active ? 'text-md-primary' : 'text-md-on-surface-variant'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Client Indicator */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono-num text-md-on-surface-variant uppercase">
              InnerTube
            </span>
          </div>
        </nav>

        {/* Center Main Scrollable View */}
        <main className="flex-1 overflow-y-auto bg-md-surface relative">
          {/* SponsorBlock Live Auto-Skip Toast Banner */}
          {skipToast && (
            <div className="sticky top-4 z-40 mx-auto max-w-md px-4 py-3 rounded-m3-lg bg-md-surface-container-highest/95 backdrop-blur-xl border border-md-primary/50 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-5 h-5 text-pink-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-md-on-surface truncate">
                    SponsorBlock Auto-Skipped {skipToast.label}
                  </div>
                  <div className="text-[11px] font-mono-num text-md-on-surface-variant">
                    Jumped {formatSeconds(skipToast.segment.startTime)} →{' '}
                    {formatSeconds(skipToast.segment.endTime)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleUndoSkip}
                className="px-3 py-1 rounded-full bg-md-primary text-md-on-primary text-xs font-bold flex items-center gap-1 shrink-0 hover:opacity-90"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            </div>
          )}

          {/* VIEW 1: HOME FEED */}
          {activeNav === 'home' && (
            <div className="p-5 md:p-7 space-y-8 pb-32">
              {/* Hero Welcome Card */}
              <div className="p-6 rounded-m3-xl bg-gradient-to-r from-md-primary-container/70 via-md-secondary-container/50 to-md-surface-container border border-md-primary/25 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-lg">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-md-primary/20 text-md-primary text-xs font-extrabold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      YouTube Music InnerTube (WEB_REMIX) + SponsorBlock + RYD +
                      LRCLIB
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-md-on-surface">
                    Ad-Free Streaming with Automatic Non-Music Skipping
                  </h1>
                  <p className="text-xs md:text-sm text-md-on-surface-variant leading-relaxed">
                    Every track automatically queries{' '}
                    <strong className="text-md-on-surface">SponsorBlock</strong>{' '}
                    to skip non-music intros/outros &amp; skits, restores community
                    dislikes via{' '}
                    <strong className="text-md-on-surface">
                      ReturnYouTubeDislike
                    </strong>
                    , and streams time-synced karaoke lyrics from{' '}
                    <strong className="text-md-on-surface">LRCLIB</strong>.
                  </p>
                </div>

                {currentTrack && (
                  <button
                    onClick={() => setIsExpandedPlayerOpen(true)}
                    className="px-5 py-3 rounded-m3-xl bg-md-primary text-md-on-primary font-extrabold text-xs md:text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Open Full Karaoke &amp; Video Player</span>
                  </button>
                )}
              </div>

              {isLoadingHome ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-m3-lg bg-md-surface-container-high"
                    />
                  ))}
                </div>
              ) : (
                homeShelves.map((shelf) => (
                  <section key={shelf.id} className="space-y-3.5">
                    <div className="flex items-end justify-between">
                      <div>
                        <h2 className="text-lg md:text-xl font-extrabold text-md-on-surface">
                          {shelf.title}
                        </h2>
                        {shelf.subtitle && (
                          <p className="text-xs text-md-on-surface-variant mt-0.5">
                            {shelf.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {shelf.type === 'showcase' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {shelf.items.map((item) => {
                          const active =
                            currentTrack?.videoId === item.videoId;
                          return (
                            <div
                              key={item.id}
                              onClick={() =>
                                loadTrack(item, shelf.items, true)
                              }
                              className={`group relative p-3.5 rounded-m3-lg border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                                active
                                  ? 'bg-md-primary-container/50 border-md-primary shadow-md'
                                  : 'bg-md-surface-container hover:bg-md-surface-container-high border-md-outline-variant/25'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-m3-md overflow-hidden shrink-0 bg-md-surface-container-highest shadow">
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Play className="w-6 h-6 text-white fill-white" />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-extrabold text-md-on-surface truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-md-on-surface-variant truncate">
                                    {item.artist}
                                  </div>
                                  <div className="text-[11px] font-mono-num text-md-on-surface-variant/80 mt-0.5">
                                    {item.plays} • {item.duration}
                                  </div>
                                </div>
                              </div>

                              {item.sponsorBlockBadge && (
                                <div className="px-2.5 py-1 rounded-m3-sm bg-pink-500/15 border border-pink-500/30 text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                                  <span className="truncate">
                                    {item.sponsorBlockBadge}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : shelf.type === 'songs' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {shelf.items.slice(0, 12).map((item, idx) => {
                          const active =
                            currentTrack?.videoId === item.videoId;
                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              onClick={() =>
                                loadTrack(item, shelf.items, true)
                              }
                              className={`group flex items-center gap-3 p-2.5 rounded-m3-md border cursor-pointer transition-all ${
                                active
                                  ? 'bg-md-primary-container/45 border-md-primary'
                                  : 'bg-md-surface-container hover:bg-md-surface-container-high border-md-outline-variant/15'
                              }`}
                            >
                              <div className="relative w-12 h-12 rounded-m3-sm overflow-hidden shrink-0 bg-md-surface-container-highest">
                                <img
                                  src={item.thumbnail}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Play className="w-5 h-5 text-white fill-white" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-md-on-surface truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-md-on-surface-variant truncate">
                                  {item.artist}
                                </div>
                              </div>
                              <span className="text-[11px] font-mono-num text-md-on-surface-variant">
                                {item.duration}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {shelf.items.slice(0, 12).map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            onClick={() => {
                              if (item.videoId)
                                loadTrack(item, shelf.items, true);
                              else if (item.browseId)
                                handleBrowseItem(item.browseId);
                            }}
                            className="group p-3 rounded-m3-lg bg-md-surface-container hover:bg-md-surface-container-high border border-md-outline-variant/20 cursor-pointer transition-all"
                          >
                            <div
                              className={`relative aspect-square overflow-hidden mb-2.5 bg-md-surface-container-highest shadow ${
                                item.type === 'artist'
                                  ? 'rounded-full'
                                  : 'rounded-m3-md'
                              }`}
                            >
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <div className="w-10 h-10 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center shadow-lg">
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="text-xs font-bold text-md-on-surface truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-md-on-surface-variant truncate mt-0.5">
                              {item.subtitle || item.artist}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: EXPLORE & CHARTS */}
          {activeNav === 'explore' && (
            <div className="p-5 md:p-7 space-y-7 pb-32">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
                  InnerTube FEmusic_charts
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-md-on-surface mt-0.5">
                  Global Charts, Albums &amp; Top Artists
                </h1>
              </div>

              {/* Mood Quick-Search Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Pop Hits 2026',
                  'Synthwave & Retro',
                  'Hip-Hop Essentials',
                  'Lo-Fi Beats to Study',
                  'Indie Chill',
                  'Electronic Dance',
                  'Rock Classics',
                  'R&B Soul',
                ].map((mood) => (
                  <button
                    key={mood}
                    onClick={() => {
                      setSearchQuery(mood);
                      executeSearch(mood, 'songs');
                    }}
                    className="px-4 py-2 rounded-full bg-md-surface-container-high hover:bg-md-primary hover:text-md-on-primary text-xs font-bold text-md-on-surface transition-all border border-md-outline-variant/30"
                  >
                    {mood}
                  </button>
                ))}
              </div>

              {homeShelves
                .filter((s) => s.id.startsWith('charts-') || s.type === 'showcase')
                .map((shelf) => (
                  <section key={shelf.id} className="space-y-3">
                    <h2 className="text-lg font-extrabold text-md-on-surface">
                      {shelf.title}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {shelf.items.slice(0, 12).map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          onClick={() => {
                            if (item.videoId)
                              loadTrack(item, shelf.items, true);
                            else if (item.browseId)
                              handleBrowseItem(item.browseId);
                          }}
                          className="group p-3 rounded-m3-lg bg-md-surface-container hover:bg-md-surface-container-high border border-md-outline-variant/20 cursor-pointer transition-all"
                        >
                          <div
                            className={`relative aspect-square overflow-hidden mb-2.5 bg-md-surface-container-highest ${
                              item.type === 'artist'
                                ? 'rounded-full'
                                : 'rounded-m3-md'
                            }`}
                          >
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="text-xs font-bold text-md-on-surface truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-md-on-surface-variant truncate">
                            {item.artist}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}

          {/* VIEW 3: INNERTUBE SEARCH RESULTS */}
          {activeNav === 'search' && (
            <div className="p-5 md:p-7 space-y-6 pb-32">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
                    YouTube Music InnerTube Search
                  </span>
                  <h1 className="text-2xl font-extrabold text-md-on-surface">
                    {searchQuery
                      ? `Results for "${searchQuery}"`
                      : 'Search YouTube Music'}
                  </h1>
                </div>

                {/* InnerTube Filter Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'songs', label: 'Songs' },
                      { id: 'videos', label: 'Videos' },
                      { id: 'albums', label: 'Albums' },
                      { id: 'artists', label: 'Artists' },
                      { id: 'playlists', label: 'Playlists' },
                    ] as { id: SearchFilter; label: string }[]
                  ).map((chip) => {
                    const active = searchFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => {
                          setSearchFilter(chip.id);
                          if (searchQuery.trim()) {
                            executeSearch(searchQuery, chip.id);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                          active
                            ? 'bg-md-primary text-md-on-primary shadow-sm'
                            : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isSearching ? (
                <div className="space-y-2.5 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-m3-md bg-md-surface-container-high"
                    />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-12 rounded-m3-xl bg-md-surface-container text-center space-y-2">
                  <Search className="w-10 h-10 text-md-primary mx-auto opacity-50" />
                  <div className="text-base font-bold text-md-on-surface">
                    Search any song, artist, album, or music video
                  </div>
                  <p className="text-xs text-md-on-surface-variant max-w-md mx-auto">
                    Powered directly by YouTube Music&apos;s InnerTube API with
                    automatic SponsorBlock segment lookup, ReturnYouTubeDislike
                    votes, and LRCLIB synced lyrics.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((item, idx) => {
                    const isPlayingItem =
                      currentTrack?.videoId &&
                      currentTrack.videoId === item.videoId;
                    const liked = isTrackLiked(item.videoId);
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className={`group flex items-center gap-3.5 p-3 rounded-m3-lg border transition-all ${
                          isPlayingItem
                            ? 'bg-md-primary-container/45 border-md-primary'
                            : 'bg-md-surface-container hover:bg-md-surface-container-high border-md-outline-variant/20'
                        }`}
                      >
                        <div
                          onClick={() => {
                            if (item.videoId)
                              loadTrack(item, searchResults, true);
                            else if (item.browseId)
                              handleBrowseItem(item.browseId);
                          }}
                          className={`relative w-12 h-12 overflow-hidden shrink-0 cursor-pointer bg-md-surface-container-highest ${
                            item.type === 'artist'
                              ? 'rounded-full'
                              : 'rounded-m3-md'
                          }`}
                        >
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            if (item.videoId)
                              loadTrack(item, searchResults, true);
                            else if (item.browseId)
                              handleBrowseItem(item.browseId);
                          }}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-sm font-bold text-md-on-surface truncate flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.explicit && (
                              <span className="px-1.5 py-0.2 rounded bg-md-surface-container-highest text-[10px] font-bold text-md-on-surface-variant">
                                E
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-md-on-surface-variant truncate">
                            {item.artist}{' '}
                            {item.album ? `• ${item.album}` : ''}{' '}
                            {item.plays ? `• ${item.plays}` : ''}
                          </div>
                        </div>

                        {item.videoId && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleLike(item)}
                              className={`p-2 rounded-full hover:bg-md-surface-container-highest ${
                                liked
                                  ? 'text-rose-400'
                                  : 'text-md-on-surface-variant'
                              }`}
                              title="Like Song"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  liked ? 'fill-rose-400' : ''
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => setPlaylistModalTrack(item)}
                              className="p-2 rounded-full hover:bg-md-surface-container-highest text-md-on-surface-variant"
                              title="Add to Playlist"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-right font-mono-num text-xs text-md-on-surface-variant">
                              {item.duration}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: LIBRARY & LOCAL PLAYLISTS */}
          {activeNav === 'library' && (
            <div className="p-5 md:p-7 space-y-6 pb-32">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
                    Local SimpMusic Library
                  </span>
                  <h1 className="text-2xl font-extrabold text-md-on-surface">
                    Your Songs, History &amp; Playlists
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {(
                    [
                      {
                        id: 'liked',
                        label: `Liked Songs (${likedSongs.length})`,
                      },
                      {
                        id: 'playlists',
                        label: `Playlists (${playlists.length})`,
                      },
                      {
                        id: 'recent',
                        label: `History (${recentlyPlayed.length})`,
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedLibraryTab(t.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        selectedLibraryTab === t.id
                          ? 'bg-md-primary text-md-on-primary shadow-sm'
                          : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedLibraryTab === 'liked' && (
                <div className="space-y-2">
                  {likedSongs.length === 0 ? (
                    <div className="p-10 rounded-m3-xl bg-md-surface-container text-center space-y-2">
                      <Heart className="w-8 h-8 text-rose-400 mx-auto opacity-70" />
                      <div className="text-sm font-bold">
                        No Liked Songs Yet
                      </div>
                      <p className="text-xs text-md-on-surface-variant">
                        Tap the heart icon on any song to save it to your local
                        library.
                      </p>
                    </div>
                  ) : (
                    likedSongs.map((track, idx) => (
                      <div
                        key={`${track.videoId}-${idx}`}
                        onClick={() => loadTrack(track, likedSongs, true)}
                        className="flex items-center gap-3.5 p-3 rounded-m3-lg bg-md-surface-container hover:bg-md-surface-container-high cursor-pointer"
                      >
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-12 h-12 rounded-m3-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold truncate">
                            {track.title}
                          </div>
                          <div className="text-xs text-md-on-surface-variant truncate">
                            {track.artist}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(track);
                          }}
                          className="p-2 text-rose-400"
                        >
                          <Heart className="w-4 h-4 fill-rose-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedLibraryTab === 'recent' && (
                <div className="space-y-2">
                  {recentlyPlayed.map((track, idx) => (
                    <div
                      key={`${track.videoId}-${idx}`}
                      onClick={() => loadTrack(track, recentlyPlayed, true)}
                      className="flex items-center gap-3.5 p-3 rounded-m3-lg bg-md-surface-container hover:bg-md-surface-container-high cursor-pointer"
                    >
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-12 h-12 rounded-m3-md object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate">
                          {track.title}
                        </div>
                        <div className="text-xs text-md-on-surface-variant truncate">
                          {track.artist}
                        </div>
                      </div>
                      <span className="text-xs font-mono-num text-md-on-surface-variant">
                        {track.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedLibraryTab === 'playlists' && (
                <div className="space-y-5">
                  {/* New Playlist Input */}
                  <div className="p-4 rounded-m3-lg bg-md-surface-container border border-md-outline-variant/30 flex items-center gap-3">
                    <FolderPlus className="w-5 h-5 text-md-primary shrink-0" />
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Create a new custom playlist..."
                      className="flex-1 bg-transparent text-sm text-md-on-surface focus:outline-none"
                    />
                    <button
                      onClick={handleCreatePlaylist}
                      className="px-4 py-1.5 rounded-full bg-md-primary text-md-on-primary text-xs font-bold"
                    >
                      Create
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {playlists.map((pl) => (
                      <div
                        key={pl.id}
                        className="p-4 rounded-m3-xl bg-md-surface-container border border-md-outline-variant/25 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-extrabold text-md-on-surface">
                              {pl.name}
                            </h3>
                            <p className="text-xs text-md-on-surface-variant">
                              {pl.tracks.length} tracks • {pl.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {pl.tracks.length > 0 && (
                              <button
                                onClick={() =>
                                  loadTrack(pl.tracks[0], pl.tracks, true)
                                }
                                className="px-3.5 py-1.5 rounded-full bg-md-primary text-md-on-primary text-xs font-bold flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Play</span>
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setPlaylists((prev) =>
                                  prev.filter((item) => item.id !== pl.id)
                                )
                              }
                              className="p-1.5 text-md-on-surface-variant hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {pl.tracks.length > 0 && (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {pl.tracks.map((t, i) => (
                              <div
                                key={`${t.videoId}-${i}`}
                                onClick={() => loadTrack(t, pl.tracks, true)}
                                className="flex items-center gap-2.5 p-1.5 rounded-m3-sm hover:bg-md-surface-container-high cursor-pointer text-xs"
                              >
                                <img
                                  src={t.thumbnail}
                                  alt={t.title}
                                  className="w-7 h-7 rounded object-cover"
                                />
                                <span className="font-semibold truncate flex-1">
                                  {t.title}
                                </span>
                                <span className="text-md-on-surface-variant truncate max-w-[120px]">
                                  {t.artist}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: BROWSE DETAIL (ALBUM / PLAYLIST / ARTIST) */}
          {activeNav === 'browse_detail' && (
            <BrowseDetailView
              detail={browseDetail}
              isLoading={isLoadingBrowse}
              currentTrack={currentTrack}
              onBack={() => setActiveNav(previousNav)}
              onPlayTrack={(t, q) => loadTrack(t, q, true)}
              onBrowseItem={handleBrowseItem}
              isTrackLiked={isTrackLiked}
              onToggleLike={handleToggleLike}
              onAddTrackToPlaylist={(t) => setPlaylistModalTrack(t)}
            />
          )}
        </main>

        {/* Right SimpMusic Multi-Tab Drawer (Desktop Fixed + Mobile Modal) */}
        <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
          <RightDrawerPanel
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            currentTrack={currentTrack}
            trackContext={trackContext}
            isLoadingContext={isLoadingContext}
            currentTime={currentTime}
            lyricsOffset={lyricsOffset}
            onAdjustLyricsOffset={(delta) =>
              setLyricsOffset((prev) => Math.round((prev + delta) * 10) / 10)
            }
            onSeek={handleSeek}
            categorySettings={categorySettings}
            onUpdateCategoryBehavior={(cat, behavior) =>
              setCategorySettings((prev) => ({
                ...prev,
                [cat]: { ...prev[cat], behavior },
              }))
            }
            skippedCount={skippedCount}
            timeSavedSeconds={timeSavedSeconds}
            queue={queue}
            onPlayTrack={(t) => loadTrack(t, queue, true)}
            onRemoveFromQueue={(idx) =>
              setQueue((prev) => prev.filter((_, i) => i !== idx))
            }
            onSaveQueueAsPlaylist={handleSaveQueueAsPlaylist}
            onTestSegmentSkip={handleTestSegmentSkip}
          />
        </div>
      </div>

      {/* Bottom Persistent Material You Player Bar */}
      <footer className="h-24 px-4 md:px-6 bg-md-surface-container border-t border-md-outline-variant/30 flex flex-col justify-center shrink-0 z-40 relative">
        {/* Top Interactive Seekbar with SponsorBlock Colored Markers */}
        <div className="w-full -mt-2 mb-1">
          <SeekbarWithSponsorBlock
            currentTime={currentTime}
            duration={duration}
            segments={segments}
            categorySettings={categorySettings}
            onSeek={handleSeek}
            compact
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Left: Track Info + RYD Dislike Counter + SponsorBlock Badge */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1 max-w-sm">
            {currentTrack ? (
              <>
                <div
                  onClick={() => setIsExpandedPlayerOpen(true)}
                  className="relative w-13 h-13 rounded-m3-md overflow-hidden shrink-0 cursor-pointer group bg-md-surface-container-highest shadow-md border border-md-outline-variant/30"
                  style={{ width: '52px', height: '52px' }}
                >
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => setIsExpandedPlayerOpen(true)}
                      className="text-sm font-extrabold text-md-on-surface truncate cursor-pointer hover:text-md-primary"
                    >
                      {currentTrack.title}
                    </span>
                    <button
                      onClick={() => handleToggleLike(currentTrack)}
                      className={`shrink-0 ${
                        isTrackLiked(currentTrack.videoId)
                          ? 'text-rose-400'
                          : 'text-md-on-surface-variant hover:text-md-on-surface'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isTrackLiked(currentTrack.videoId)
                            ? 'fill-rose-400'
                            : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="text-xs text-md-on-surface-variant truncate">
                    {currentTrack.artist}
                  </div>

                  {/* Live RYD + SponsorBlock Mini Pills */}
                  <div className="flex items-center gap-2 mt-1">
                    {ryd && (
                      <button
                        onClick={() => {
                          setDrawerTab('ryd');
                          setIsMobileDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-md-surface-container-highest text-[10px] font-mono-num font-bold text-md-on-surface-variant hover:text-md-on-surface"
                        title="ReturnYouTubeDislike Live Votes"
                      >
                        <ThumbsUp className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{formatCompactNumber(ryd.likes)}</span>
                        <span className="opacity-40">|</span>
                        <ThumbsDown className="w-2.5 h-2.5 text-rose-400" />
                        <span>{formatCompactNumber(ryd.dislikes)}</span>
                      </button>
                    )}

                    {segments.length > 0 && (
                      <button
                        onClick={() => {
                          setDrawerTab('sponsorblock');
                          setIsMobileDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold"
                        title="View SponsorBlock Segments"
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{segments.length} SB</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-md-on-surface-variant">
                Select any track to start streaming
              </div>
            )}
          </div>

          {/* Center: Transport Controls + Elapsed / Total Time */}
          <div className="flex items-center gap-3 md:gap-5">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`hidden sm:flex p-2 rounded-full transition-colors ${
                isShuffle
                  ? 'text-md-primary bg-md-primary-container/40'
                  : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
              title="Shuffle Queue"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrevTrack}
              className="p-2 rounded-full hover:bg-md-surface-container-high text-md-on-surface"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-12 h-12 rounded-m3-lg bg-md-primary text-md-on-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-2 rounded-full hover:bg-md-surface-container-high text-md-on-surface"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={() =>
                setRepeatMode((prev) =>
                  prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
                )
              }
              className={`hidden sm:flex p-2 rounded-full transition-colors ${
                repeatMode !== 'off'
                  ? 'text-md-primary bg-md-primary-container/40'
                  : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
              title="Repeat Mode"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>

            <div className="hidden md:block text-xs font-mono-num text-md-on-surface-variant pl-1">
              <span className="text-md-on-surface font-bold">
                {formatSeconds(currentTime)}
              </span>{' '}
              / {formatSeconds(duration)}
            </div>
          </div>

          {/* Right: Audio/Video Mode Switch + Drawer Tabs + Volume + Fullscreen */}
          <div className="flex items-center justify-end gap-2 flex-1 max-w-sm">
            {/* Manual Skip Button if inside a Manual SponsorBlock Segment */}
            {activeManualSegment && (
              <button
                onClick={() => executeSponsorSkip(activeManualSegment)}
                className="px-3 py-1.5 rounded-full bg-pink-500 text-white text-xs font-extrabold flex items-center gap-1 shadow animate-pulse"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Skip Segment</span>
              </button>
            )}

            {/* Audio vs Video Quick Button */}
            <button
              onClick={() => {
                const nextMode =
                  engineMode === 'direct_audio'
                    ? 'youtube_embed'
                    : 'direct_audio';
                handleChangeEngineMode(nextMode);
                if (nextMode === 'youtube_embed') {
                  setIsExpandedPlayerOpen(true);
                }
              }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                engineMode === 'youtube_embed'
                  ? 'bg-md-primary text-md-on-primary'
                  : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
              }`}
              title="Toggle Studio Audio / Official YouTube Music Video"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{engineMode === 'youtube_embed' ? 'Video' : 'Audio'}</span>
            </button>

            {/* Volume Control */}
            <div className="hidden xl:flex items-center gap-2 w-28">
              <button
                onClick={handleToggleMute}
                className="text-md-on-surface-variant hover:text-md-on-surface"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-md-primary h-1 bg-md-surface-container-highest rounded-lg cursor-pointer"
              />
            </div>

            {/* Expand Full Karaoke & Video Player */}
            <button
              onClick={() => setIsExpandedPlayerOpen(true)}
              className="p-2 rounded-full bg-md-surface-container-high hover:bg-md-primary hover:text-md-on-primary text-md-on-surface transition-colors"
              title="Expand Full Player & Karaoke View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden h-14 bg-md-surface-container-low border-t border-md-outline-variant/25 grid grid-cols-5 items-center px-2 shrink-0 z-40">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'explore', label: 'Charts', icon: Compass },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'library', label: 'Library', icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as NavSection)}
              className={`flex flex-col items-center justify-center py-1 ${
                active ? 'text-md-primary' : 'text-md-on-surface-variant'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="flex flex-col items-center justify-center py-1 text-md-primary"
        >
          <Mic2 className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-0.5">Lyrics/SB</span>
        </button>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="h-[78vh] w-full bg-md-surface-container-low rounded-t-m3-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-md-surface-container flex justify-between items-center border-b border-md-outline-variant/20">
              <span className="text-xs font-bold text-md-primary">
                SimpMusic Inspector (Lyrics • SponsorBlock • RYD • Queue)
              </span>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="text-xs font-bold px-3 py-1 rounded-full bg-md-surface-container-high"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RightDrawerPanel
                activeTab={drawerTab}
                onTabChange={setDrawerTab}
                currentTrack={currentTrack}
                trackContext={trackContext}
                isLoadingContext={isLoadingContext}
                currentTime={currentTime}
                lyricsOffset={lyricsOffset}
                onAdjustLyricsOffset={(delta) =>
                  setLyricsOffset((prev) => Math.round((prev + delta) * 10) / 10)
                }
                onSeek={handleSeek}
                categorySettings={categorySettings}
                onUpdateCategoryBehavior={(cat, behavior) =>
                  setCategorySettings((prev) => ({
                    ...prev,
                    [cat]: { ...prev[cat], behavior },
                  }))
                }
                skippedCount={skippedCount}
                timeSavedSeconds={timeSavedSeconds}
                queue={queue}
                onPlayTrack={(t) => loadTrack(t, queue, true)}
                onRemoveFromQueue={(idx) =>
                  setQueue((prev) => prev.filter((_, i) => i !== idx))
                }
                onSaveQueueAsPlaylist={handleSaveQueueAsPlaylist}
                onTestSegmentSkip={handleTestSegmentSkip}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add to Custom Playlist Modal */}
      {playlistModalTrack && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-m3-xl bg-md-surface-container border border-md-outline-variant/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-md-on-surface">
                Add &ldquo;{playlistModalTrack.title}&rdquo; to Playlist
              </h3>
              <button
                onClick={() => setPlaylistModalTrack(null)}
                className="text-xs font-bold text-md-on-surface-variant"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() =>
                    handleAddTrackToExistingPlaylist(pl.id, playlistModalTrack)
                  }
                  className="w-full p-3 rounded-m3-md bg-md-surface-container-high hover:bg-md-primary-container/50 text-left flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-md-on-surface">
                    {pl.name}
                  </span>
                  <span className="text-[11px] text-md-on-surface-variant">
                    {pl.tracks.length} songs
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-md-outline-variant/25 flex items-center gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Or create new playlist..."
                className="flex-1 px-3 py-2 rounded-m3-md bg-md-surface-container-high text-xs text-md-on-surface focus:outline-none"
              />
              <button
                onClick={handleCreatePlaylist}
                className="px-4 py-2 rounded-m3-md bg-md-primary text-md-on-primary text-xs font-bold"
              >
                Create &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Expanded Player & Video / Karaoke Overlay */}
      <ExpandedPlayerOverlay
        isOpen={isExpandedPlayerOpen}
        onClose={() => setIsExpandedPlayerOpen(false)}
        currentTrack={currentTrack}
        trackContext={trackContext}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        repeatMode={repeatMode}
        onCycleRepeat={() =>
          setRepeatMode((prev) =>
            prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
          )
        }
        engineMode={engineMode}
        onChangeEngineMode={handleChangeEngineMode}
        categorySettings={categorySettings}
        activeManualSegment={activeManualSegment}
        onSkipSegmentNow={executeSponsorSkip}
        isLiked={isTrackLiked(currentTrack?.videoId)}
        onToggleLike={() => currentTrack && handleToggleLike(currentTrack)}
        onOpenAddToPlaylist={() =>
          currentTrack && setPlaylistModalTrack(currentTrack)
        }
        playbackRate={playbackRate}
        onChangePlaybackRate={handleChangePlaybackRate}
      />

      {/* Material You Theme, Sleep Timer & Cross-Platform Settings Modal */}
      <SettingsAndCrossPlatformModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedThemeId={selectedThemeId}
        onSelectTheme={(id, hue) => {
          setSelectedThemeId(id);
          if (hue !== null) {
            applyMaterialYouSeedHue(hue);
          } else if (currentTrack?.thumbnail) {
            extractSeedHueFromImage(currentTrack.thumbnail).then((h) => {
              if (h !== null) applyMaterialYouSeedHue(h);
            });
          }
        }}
        sleepTimerMinutes={sleepTimerMinutes}
        onSetSleepTimer={setSleepTimerMinutes}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
}
export default App;
