import React, { useEffect, useRef } from 'react';
import {
  Mic2,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  ListMusic,
  FastForward,
  Sparkles,
  CheckCircle2,
  Sliders,
  Play,
  Trash2,
  Eye,
  Star,
  Radio,
  Clock,
  Plus,
} from 'lucide-react';
import {
  LyricsData,
  RYDStats,
  SponsorBlockSegment,
  SponsorBehavior,
  SponsorCategory,
  SponsorCategorySetting,
  TrackContextData,
  TrackItem,
} from '../types/music';
import { formatCompactNumber, formatSeconds } from '../utils/materialYou';

export type DrawerTab = 'lyrics' | 'sponsorblock' | 'ryd' | 'queue';

interface RightDrawerProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  currentTrack: TrackItem | null;
  trackContext: TrackContextData | null;
  isLoadingContext: boolean;
  currentTime: number;
  lyricsOffset: number;
  onAdjustLyricsOffset: (delta: number) => void;
  onSeek: (sec: number) => void;
  categorySettings: Record<SponsorCategory, SponsorCategorySetting>;
  onUpdateCategoryBehavior: (
    cat: SponsorCategory,
    behavior: SponsorBehavior
  ) => void;
  skippedCount: number;
  timeSavedSeconds: number;
  queue: TrackItem[];
  onPlayTrack: (track: TrackItem) => void;
  onRemoveFromQueue: (index: number) => void;
  onSaveQueueAsPlaylist: () => void;
  onTestSegmentSkip: (segment: SponsorBlockSegment) => void;
}

export const RightDrawerPanel: React.FC<RightDrawerProps> = ({
  activeTab,
  onTabChange,
  currentTrack,
  trackContext,
  isLoadingContext,
  currentTime,
  lyricsOffset,
  onAdjustLyricsOffset,
  onSeek,
  categorySettings,
  onUpdateCategoryBehavior,
  skippedCount,
  timeSavedSeconds,
  queue,
  onPlayTrack,
  onRemoveFromQueue,
  onSaveQueueAsPlaylist,
  onTestSegmentSkip,
}) => {
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  const lyrics: LyricsData | undefined = trackContext?.lyrics;
  const effectiveTime = currentTime - lyricsOffset;

  // Determine active synced lyric index
  const activeLyricIndex = React.useMemo(() => {
    if (!lyrics?.hasSynced || !lyrics.syncedLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.syncedLines.length; i++) {
      if (effectiveTime >= lyrics.syncedLines[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, effectiveTime]);

  // Smooth scroll active lyric into center of container
  useEffect(() => {
    if (
      activeTab === 'lyrics' &&
      activeLyricRef.current &&
      lyricsContainerRef.current
    ) {
      const container = lyricsContainerRef.current;
      const el = activeLyricRef.current;
      const targetScroll =
        el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeLyricIndex, activeTab]);

  const segments = trackContext?.sponsorBlock?.segments || [];
  const ryd: RYDStats | undefined = trackContext?.returnYouTubeDislike;

  return (
    <aside className="flex flex-col h-full bg-md-surface-container-low border-l border-md-outline-variant/40 select-none">
      {/* Top Material 3 Segmented Tab Bar */}
      <div className="p-3 border-b border-md-outline-variant/30 bg-md-surface-container/60">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-m3-lg bg-md-surface-container-high">
          <button
            onClick={() => onTabChange('lyrics')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-m3-md text-xs font-semibold transition-all ${
              activeTab === 'lyrics'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5 shrink-0" />
            <span>Lyrics</span>
          </button>

          <button
            onClick={() => onTabChange('sponsorblock')}
            className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-m3-md text-xs font-semibold transition-all ${
              activeTab === 'sponsorblock'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Sponsor</span>
            {segments.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'sponsorblock'
                    ? 'bg-md-on-primary text-md-primary'
                    : 'bg-pink-500/20 text-pink-300'
                }`}
              >
                {segments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('ryd')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-m3-md text-xs font-semibold transition-all ${
              activeTab === 'ryd'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5 shrink-0" />
            <span>RYD</span>
          </button>

          <button
            onClick={() => onTabChange('queue')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-m3-md text-xs font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5 shrink-0" />
            <span>Queue</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: SYNCED KARAOKE LYRICS (LRCLIB + INNERTUBE) */}
        {activeTab === 'lyrics' && (
          <div className="flex flex-col h-full">
            {/* Lyrics Header & Timing Offset Bar */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-md-outline-variant/20 bg-md-surface-container/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3" />
                  {lyrics?.hasSynced
                    ? 'LRCLIB Time-Synced'
                    : lyrics?.plainLyrics
                    ? lyrics.source
                    : 'Lyrics Engine'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-md-on-surface-variant">
                <span className="text-[11px] mr-1">
                  Offset: {lyricsOffset >= 0 ? `+${lyricsOffset}s` : `${lyricsOffset}s`}
                </span>
                <button
                  onClick={() => onAdjustLyricsOffset(-0.5)}
                  className="px-1.5 py-0.5 rounded bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface font-mono-num text-[11px]"
                  title="Delay lyrics by -0.5s"
                >
                  -0.5s
                </button>
                <button
                  onClick={() => onAdjustLyricsOffset(-lyricsOffset)}
                  className="px-1.5 py-0.5 rounded bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface text-[11px]"
                >
                  0s
                </button>
                <button
                  onClick={() => onAdjustLyricsOffset(0.5)}
                  className="px-1.5 py-0.5 rounded bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface font-mono-num text-[11px]"
                  title="Advance lyrics by +0.5s"
                >
                  +0.5s
                </button>
              </div>
            </div>

            {/* Lyrics Scroll Viewport */}
            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto px-5 py-8 space-y-3 relative"
            >
              {isLoadingContext ? (
                <div className="space-y-4 py-8 animate-pulse">
                  {[...Array(7)].map((_, idx) => (
                    <div
                      key={idx}
                      className="h-5 rounded-full bg-md-surface-container-high"
                      style={{ width: `${65 + ((idx * 17) % 30)}%` }}
                    />
                  ))}
                </div>
              ) : lyrics?.hasSynced && lyrics.syncedLines.length > 0 ? (
                lyrics.syncedLines.map((line, i) => {
                  const isActive = i === activeLyricIndex;
                  const isPast = i < activeLyricIndex;
                  return (
                    <button
                      key={`${line.time}-${i}`}
                      ref={isActive ? activeLyricRef : null}
                      onClick={() => onSeek(line.time)}
                      className={`w-full text-left py-2 px-3 rounded-m3-md transition-all duration-300 group flex items-baseline justify-between gap-3 ${
                        isActive
                          ? 'bg-md-primary-container/45 text-md-primary scale-[1.02] font-bold text-lg shadow-sm'
                          : isPast
                          ? 'text-md-on-surface-variant/45 hover:text-md-on-surface text-sm font-medium'
                          : 'text-md-on-surface-variant/80 hover:text-md-on-surface text-base font-semibold'
                      }`}
                    >
                      <span className="leading-snug">{line.text}</span>
                      <span
                        className={`font-mono-num text-[11px] shrink-0 transition-opacity ${
                          isActive
                            ? 'opacity-100 text-md-primary'
                            : 'opacity-0 group-hover:opacity-80 text-md-on-surface-variant'
                        }`}
                      >
                        {formatSeconds(line.time)}
                      </span>
                    </button>
                  );
                })
              ) : lyrics?.plainLyrics ? (
                <div className="whitespace-pre-line text-sm leading-relaxed text-md-on-surface-variant font-medium">
                  {lyrics.plainLyrics}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-md-on-surface-variant">
                  <Mic2 className="w-10 h-10 mb-3 opacity-40 text-md-primary" />
                  <p className="text-sm font-semibold text-md-on-surface">
                    No synced lyrics found for this track
                  </p>
                  <p className="text-xs mt-1 max-w-xs opacity-75">
                    Try playing any track from the SponsorBlock & Synced Lyrics Featured shelf or search popular songs.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SPONSORBLOCK INSPECTOR & CATEGORY SETTINGS */}
        {activeTab === 'sponsorblock' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Session Telemetry Banner */}
            <div className="p-3.5 rounded-m3-lg bg-gradient-to-br from-md-primary-container/60 to-md-secondary-container/40 border border-md-primary/25 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-md-primary">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SponsorBlock Active</span>
                </div>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  Video ID:{' '}
                  <span className="font-mono-num text-md-on-surface font-semibold">
                    {trackContext?.sponsorBlock?.videoId ||
                      currentTrack?.videoId ||
                      'N/A'}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold font-mono-num text-md-on-primary-container">
                  {skippedCount} skipped
                </div>
                <div className="text-[11px] text-md-on-surface-variant font-mono-num">
                  {formatSeconds(timeSavedSeconds)} saved
                </div>
              </div>
            </div>

            {/* Active Track Segments */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-2.5 flex items-center justify-between">
                <span>Segments in Current Track ({segments.length})</span>
                <span className="text-[11px] font-normal text-md-primary">
                  sponsor.ajay.app
                </span>
              </h4>

              {segments.length === 0 ? (
                <div className="p-4 rounded-m3-lg bg-md-surface-container text-center text-xs text-md-on-surface-variant">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-400 opacity-80" />
                  Pure music track — no non-music or sponsor segments reported on SponsorBlock.
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map((seg, i) => {
                    const cfg = categorySettings[seg.category];
                    return (
                      <div
                        key={seg.uuid || i}
                        className="p-3 rounded-m3-md bg-md-surface-container hover:bg-md-surface-container-high border border-md-outline-variant/30 transition-all flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: cfg?.color || '#ff2a85',
                              }}
                            />
                            <span className="text-xs font-bold text-md-on-surface truncate">
                              {cfg?.label || seg.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-md-surface-container-highest text-[10px] font-mono-num text-md-primary">
                              {formatSeconds(seg.startTime)} →{' '}
                              {formatSeconds(seg.endTime)}
                            </span>
                          </div>
                          <div className="text-[11px] text-md-on-surface-variant mt-1 flex items-center gap-3">
                            <span>
                              Length:{' '}
                              <strong className="font-mono-num">
                                {(seg.endTime - seg.startTime).toFixed(1)}s
                              </strong>
                            </span>
                            <span>Votes: {seg.votes}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onTestSegmentSkip(seg)}
                            className="px-2.5 py-1.5 rounded-m3-sm bg-md-primary text-md-on-primary text-[11px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                            title="Jump right before this segment and trigger SponsorBlock Auto-Skip"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>Test Skip</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Behavior Configuration */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-2.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Category Skip Rules</span>
              </h4>
              <div className="space-y-2">
                {(Object.keys(categorySettings) as SponsorCategory[]).map(
                  (catKey) => {
                    const item = categorySettings[catKey];
                    return (
                      <div
                        key={catKey}
                        className="p-2.5 rounded-m3-md bg-md-surface-container border border-md-outline-variant/20 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs font-semibold text-md-on-surface">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-md-on-surface-variant truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>

                        <select
                          value={item.behavior}
                          onChange={(e) =>
                            onUpdateCategoryBehavior(
                              catKey,
                              e.target.value as SponsorBehavior
                            )
                          }
                          className="bg-md-surface-container-highest text-md-on-surface text-xs font-semibold rounded-m3-sm px-2 py-1 border border-md-outline-variant/40 focus:outline-none focus:border-md-primary"
                        >
                          <option value="autoskip">Auto-Skip</option>
                          <option value="manual">Manual Prompt</option>
                          <option value="seekbar">Seekbar Only</option>
                          <option value="off">Disabled</option>
                        </select>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RETURN YOUTUBE DISLIKE (RYD) & INNERTUBE TELEMETRY */}
        {activeTab === 'ryd' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-4 rounded-m3-lg bg-md-surface-container border border-md-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-md-primary">
                    ReturnYouTubeDislike API
                  </span>
                  <h3 className="text-sm font-bold text-md-on-surface mt-0.5">
                    Community Sentiment & Votes
                  </h3>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold font-mono-num">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{(ryd?.rating || 5).toFixed(2)} / 5.0</span>
                </div>
              </div>

              {/* Likes vs Dislikes Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-m3-md bg-md-surface-container-high border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Likes</span>
                  </div>
                  <div className="text-xl font-extrabold font-mono-num text-md-on-surface mt-1">
                    {formatCompactNumber(ryd?.likes || 0)}
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant font-mono-num">
                    {(ryd?.likes || 0).toLocaleString()} exact
                  </div>
                </div>

                <div className="p-3 rounded-m3-md bg-md-surface-container-high border border-rose-500/20">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                    <ThumbsDown className="w-4 h-4" />
                    <span>Dislikes (Restored)</span>
                  </div>
                  <div className="text-xl font-extrabold font-mono-num text-md-on-surface mt-1">
                    {formatCompactNumber(ryd?.dislikes || 0)}
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant font-mono-num">
                    {(ryd?.dislikes || 0).toLocaleString()} estimated
                  </div>
                </div>
              </div>

              {/* Sentiment Ratio Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400">
                    {ryd?.likePercentage ?? 98}% Positive
                  </span>
                  <span className="text-rose-400">
                    {(100 - (ryd?.likePercentage ?? 98)).toFixed(1)}% Dislike
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-rose-500/40 overflow-hidden">
                  <div
                    style={{ width: `${ryd?.likePercentage ?? 98}%` }}
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* View Count & Raw Vote Sample */}
              <div className="pt-2 border-t border-md-outline-variant/25 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-md-on-surface-variant">
                  <Eye className="w-4 h-4 text-md-primary" />
                  <div>
                    <div className="text-[11px]">Total Views</div>
                    <div className="font-bold font-mono-num text-md-on-surface">
                      {(ryd?.viewCount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-md-on-surface-variant">
                  <Radio className="w-4 h-4 text-md-primary" />
                  <div>
                    <div className="text-[11px]">Raw RYD Sample</div>
                    <div className="font-bold font-mono-num text-md-on-surface">
                      +{(ryd?.rawLikes || 0).toLocaleString()} / -
                      {(ryd?.rawDislikes || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* InnerTube & Audio Stream Telemetry Card */}
            <div className="p-4 rounded-m3-lg bg-md-surface-container border border-md-outline-variant/30 space-y-2.5 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-md-primary">
                InnerTube & Stream Diagnostics
              </div>
              <div className="flex justify-between py-1 border-b border-md-outline-variant/20">
                <span className="text-md-on-surface-variant">InnerTube Client</span>
                <span className="font-mono-num font-semibold text-md-on-surface">
                  {trackContext?.innertubeClient || 'WEB_REMIX 1.20240724'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-md-outline-variant/20">
                <span className="text-md-on-surface-variant">Primary Video ID</span>
                <span className="font-mono-num font-semibold text-md-primary">
                  {trackContext?.videoId || currentTrack?.videoId || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-md-outline-variant/20">
                <span className="text-md-on-surface-variant">Music Video Counterpart</span>
                <span className="font-mono-num font-semibold text-md-on-surface">
                  {trackContext?.musicVideoId || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-md-on-surface-variant">Audio Stream</span>
                <span className="font-mono-num font-semibold text-emerald-400 text-right">
                  {trackContext?.audioStream?.codec || 'YouTube IFrame Audio'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: UP NEXT QUEUE (INNERTUBE AUTOMIX RDAMVM) */}
        {activeTab === 'queue' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-md-outline-variant/20 flex items-center justify-between bg-md-surface-container/40">
              <div>
                <span className="text-xs font-bold text-md-on-surface">
                  Up Next Queue ({queue.length})
                </span>
                <span className="block text-[11px] text-md-on-surface-variant">
                  InnerTube Automix Radio (RDAMVM)
                </span>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={onSaveQueueAsPlaylist}
                  className="px-2.5 py-1 rounded-m3-sm bg-md-secondary-container text-md-on-secondary-container text-xs font-semibold hover:opacity-90 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save as Playlist</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {queue.map((item, index) => {
                const isPlaying = currentTrack?.videoId === item.videoId;
                return (
                  <div
                    key={`${item.videoId}-${index}`}
                    className={`group flex items-center gap-2.5 p-2 rounded-m3-md transition-all ${
                      isPlaying
                        ? 'bg-md-primary-container/50 border border-md-primary/30'
                        : 'hover:bg-md-surface-container-high'
                    }`}
                  >
                    <div
                      onClick={() => onPlayTrack(item)}
                      className="relative w-10 h-10 rounded-m3-sm overflow-hidden shrink-0 cursor-pointer bg-md-surface-container-highest"
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    <div
                      onClick={() => onPlayTrack(item)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className={`text-xs font-bold truncate ${
                          isPlaying ? 'text-md-primary' : 'text-md-on-surface'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-[11px] text-md-on-surface-variant truncate">
                        {item.artist}
                      </div>
                    </div>

                    <span className="text-[11px] font-mono-num text-md-on-surface-variant">
                      {item.duration}
                    </span>

                    <button
                      onClick={() => onRemoveFromQueue(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-md-surface-container-highest text-md-on-surface-variant hover:text-rose-400 transition-opacity"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
