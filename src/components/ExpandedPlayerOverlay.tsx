import React from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Tv,
  Disc3,
  Plus,
  FastForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  PlaybackEngineMode,
  SponsorBlockSegment,
  SponsorCategory,
  SponsorCategorySetting,
  TrackContextData,
  TrackItem,
} from '../types/music';
import { formatCompactNumber, formatSeconds } from '../utils/materialYou';
import { SeekbarWithSponsorBlock } from './SeekbarWithSponsorBlock';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: TrackItem | null;
  trackContext: TrackContextData | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (sec: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onCycleRepeat: () => void;
  engineMode: PlaybackEngineMode;
  onChangeEngineMode: (mode: PlaybackEngineMode) => void;
  categorySettings: Record<SponsorCategory, SponsorCategorySetting>;
  activeManualSegment: SponsorBlockSegment | null;
  onSkipSegmentNow: (seg: SponsorBlockSegment) => void;
  isLiked: boolean;
  onToggleLike: () => void;
  onOpenAddToPlaylist: () => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
}

export const ExpandedPlayerOverlay: React.FC<ExpandedPlayerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  trackContext,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  engineMode,
  onChangeEngineMode,
  categorySettings,
  activeManualSegment,
  onSkipSegmentNow,
  isLiked,
  onToggleLike,
  onOpenAddToPlaylist,
  playbackRate,
  onChangePlaybackRate,
}) => {
  if (!isOpen || !currentTrack) return null;

  const segments = trackContext?.sponsorBlock?.segments || [];
  const ryd = trackContext?.returnYouTubeDislike;
  const lyrics = trackContext?.lyrics;
  const videoIdToEmbed =
    trackContext?.musicVideoId || currentTrack.videoId || '';

  // Find current synced lyric line for mini overlay display
  const currentLyricIndex = React.useMemo(() => {
    if (!lyrics?.hasSynced || !lyrics.syncedLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.syncedLines.length; i++) {
      if (currentTime >= lyrics.syncedLines[i].time) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  return (
    <div className="fixed inset-0 z-50 bg-md-surface/95 backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Dynamic Ambient Blur Background */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none blur-3xl scale-125 transition-all duration-700"
        style={{
          backgroundImage: `url(${currentTrack.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Top Bar */}
      <div className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-md-outline-variant/25">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-xs font-bold text-md-on-surface transition-all"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Minimize Player</span>
        </button>

        {/* Audio vs Music Video Mode Switcher (SimpMusic signature toggle) */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-md-surface-container-high border border-md-outline-variant/30">
          <button
            onClick={() => onChangeEngineMode('direct_audio')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              engineMode === 'direct_audio'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Song (Studio Audio)</span>
          </button>
          <button
            onClick={() => onChangeEngineMode('youtube_embed')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              engineMode === 'youtube_embed'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Music Video (YouTube)</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <select
            value={playbackRate}
            onChange={(e) => onChangePlaybackRate(Number(e.target.value))}
            className="bg-md-surface-container-high text-md-on-surface text-xs font-bold px-3 py-1.5 rounded-full border border-md-outline-variant/30 focus:outline-none"
          >
            <option value={0.75}>0.75x Speed</option>
            <option value={1}>1.0x Normal</option>
            <option value={1.25}>1.25x Fast</option>
            <option value={1.5}>1.5x Nightcore</option>
          </select>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-10 overflow-y-auto items-center max-w-7xl mx-auto w-full">
        {/* Left Column: Artwork / Video + Player Controls + RYD + SponsorBlock Seekbar */}
        <div className="lg:col-span-6 flex flex-col items-center space-y-6">
          {/* Artwork or Embedded Music Video */}
          <div className="relative w-full max-w-md aspect-square rounded-m3-xl overflow-hidden shadow-2xl bg-md-surface-container-highest border border-md-outline-variant/40">
            {engineMode === 'youtube_embed' && videoIdToEmbed ? (
              <iframe
                key={videoIdToEmbed}
                src={`https://www.youtube-nocookie.com/embed/${videoIdToEmbed}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&start=${Math.floor(
                  currentTime
                )}`}
                title={currentTrack.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <>
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                {/* SponsorBlock Overlay Pill on Artwork */}
                {segments.length > 0 && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-pink-500/40 text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                    <span>
                      SponsorBlock: {segments.length} segment
                      {segments.length > 1 ? 's' : ''} loaded
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Manual Skip Prompt Button if inside a SponsorBlock Segment */}
            {activeManualSegment && (
              <button
                onClick={() => onSkipSegmentNow(activeManualSegment)}
                className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-md-primary text-md-on-primary font-extrabold text-xs shadow-xl flex items-center gap-2 animate-bounce"
              >
                <FastForward className="w-4 h-4" />
                <span>
                  Skip{' '}
                  {categorySettings[activeManualSegment.category]?.label ||
                    activeManualSegment.category}{' '}
                  ({formatSeconds(activeManualSegment.endTime)})
                </span>
              </button>
            )}
          </div>

          {/* Track Metadata & RYD Badges */}
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold text-md-on-surface truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm font-semibold text-md-on-surface-variant truncate mt-0.5">
                  {currentTrack.artist}{' '}
                  {currentTrack.album ? `• ${currentTrack.album}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onToggleLike}
                  className={`p-2.5 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest transition-colors ${
                    isLiked ? 'text-rose-400' : 'text-md-on-surface-variant'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${isLiked ? 'fill-rose-400' : ''}`}
                  />
                </button>
                <button
                  onClick={onOpenAddToPlaylist}
                  className="p-2.5 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface-variant transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ReturnYouTubeDislike Live Pill Bar */}
            {ryd && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono-num">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{formatCompactNumber(ryd.likes)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono-num">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{formatCompactNumber(ryd.dislikes)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-md-surface-container-high text-md-on-surface-variant text-xs font-semibold font-mono-num">
                  <span>{ryd.likePercentage}% Liked</span>
                  <span>•</span>
                  <span>{formatCompactNumber(ryd.viewCount)} views</span>
                </div>
              </div>
            )}

            {/* Seekbar with SponsorBlock Markers */}
            <div className="pt-2">
              <SeekbarWithSponsorBlock
                currentTime={currentTime}
                duration={duration}
                segments={segments}
                categorySettings={categorySettings}
                onSeek={onSeek}
              />
              <div className="flex justify-between text-xs font-mono-num text-md-on-surface-variant mt-1">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formatSeconds(duration)}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onToggleShuffle}
                className={`p-2.5 rounded-full transition-colors ${
                  isShuffle
                    ? 'bg-md-primary-container text-md-primary'
                    : 'text-md-on-surface-variant hover:text-md-on-surface'
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5">
                <button
                  onClick={onPrev}
                  className="p-3 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all"
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-16 h-16 rounded-m3-xl bg-md-primary text-md-on-primary flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="p-3 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>

              <button
                onClick={onCycleRepeat}
                className={`p-2.5 rounded-full transition-colors ${
                  repeatMode !== 'off'
                    ? 'bg-md-primary-container text-md-primary'
                    : 'text-md-on-surface-variant hover:text-md-on-surface'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onToggleMute}
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
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-full accent-md-primary h-1.5 bg-md-surface-container-highest rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Karaoke Lyrics View */}
        <div className="lg:col-span-6 h-[480px] rounded-m3-xl bg-md-surface-container/75 border border-md-outline-variant/30 p-6 flex flex-col overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-md-outline-variant/20">
            <span className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
              Time-Synced Karaoke Lyrics ({lyrics?.source || 'LRCLIB'})
            </span>
            <span className="text-xs text-md-on-surface-variant">
              Click any line to seek
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {lyrics?.hasSynced && lyrics.syncedLines.length > 0 ? (
              lyrics.syncedLines.map((line, i) => {
                const isActive = i === currentLyricIndex;
                return (
                  <button
                    key={i}
                    onClick={() => onSeek(line.time)}
                    className={`w-full text-left p-3 rounded-m3-lg transition-all flex items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-md-primary text-md-on-primary font-extrabold text-xl shadow-md scale-[1.01]'
                        : 'text-md-on-surface-variant/75 hover:bg-md-surface-container-high hover:text-md-on-surface text-base font-semibold'
                    }`}
                  >
                    <span>{line.text}</span>
                    <span className="font-mono-num text-xs opacity-75 shrink-0">
                      {formatSeconds(line.time)}
                    </span>
                  </button>
                );
              })
            ) : lyrics?.plainLyrics ? (
              <div className="whitespace-pre-line text-base leading-relaxed text-md-on-surface-variant font-medium">
                {lyrics.plainLyrics}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-md-on-surface-variant">
                Lyrics not available for this track.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
