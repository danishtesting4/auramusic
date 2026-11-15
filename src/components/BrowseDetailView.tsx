import React from 'react';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Heart,
  Plus,
  Disc3,
  Clock,
  Music,
} from 'lucide-react';
import { BrowseDetail, TrackItem } from '../types/music';

interface BrowseDetailViewProps {
  detail: BrowseDetail | null;
  isLoading: boolean;
  currentTrack: TrackItem | null;
  onBack: () => void;
  onPlayTrack: (track: TrackItem, customQueue?: TrackItem[]) => void;
  onBrowseItem: (browseId: string) => void;
  isTrackLiked: (videoId?: string | null) => boolean;
  onToggleLike: (track: TrackItem) => void;
  onAddTrackToPlaylist: (track: TrackItem) => void;
}

export const BrowseDetailView: React.FC<BrowseDetailViewProps> = ({
  detail,
  isLoading,
  currentTrack,
  onBack,
  onPlayTrack,
  onBrowseItem,
  isTrackLiked,
  onToggleLike,
  onAddTrackToPlaylist,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-md-surface-container-high text-xs font-semibold text-md-on-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-48 h-48 rounded-m3-xl bg-md-surface-container-high shrink-0" />
          <div className="space-y-3 flex-1 w-full">
            <div className="h-4 w-24 rounded bg-md-surface-container-high" />
            <div className="h-8 w-64 rounded bg-md-surface-container-high" />
            <div className="h-4 w-48 rounded bg-md-surface-container-high" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-m3-md bg-md-surface-container"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const handlePlayAll = () => {
    if (detail.tracks.length > 0) {
      onPlayTrack(detail.tracks[0], detail.tracks);
    }
  };

  const handleShuffleAll = () => {
    if (detail.tracks.length > 0) {
      const shuffled = [...detail.tracks].sort(() => Math.random() - 0.5);
      onPlayTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="p-5 md:p-7 space-y-7 pb-32">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-md-surface-container-high hover:bg-md-surface-container-highest text-xs font-semibold text-md-on-surface transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-end p-6 rounded-m3-xl bg-gradient-to-br from-md-primary-container/40 via-md-surface-container to-md-surface-container-low border border-md-outline-variant/30">
        <div
          className={`w-44 h-44 md:w-52 md:h-52 overflow-hidden shadow-2xl shrink-0 bg-md-surface-container-highest border border-md-outline-variant/40 ${
            detail.kind === 'artist' ? 'rounded-full' : 'rounded-m3-xl'
          }`}
        >
          {detail.thumbnail ? (
            <img
              src={detail.thumbnail}
              alt={detail.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-16 h-16 text-md-primary opacity-50" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-2.5 min-w-0">
          <span className="inline-block px-3 py-0.5 rounded-full bg-md-primary/20 text-md-primary text-xs font-bold uppercase tracking-wider">
            {detail.kind} • InnerTube
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-md-on-surface leading-tight">
            {detail.title}
          </h1>
          <p className="text-sm font-semibold text-md-on-surface-variant">
            {detail.artist} {detail.subtitle ? `• ${detail.subtitle}` : ''}{' '}
            {detail.secondSubtitle ? `• ${detail.secondSubtitle}` : ''}
          </p>
          {detail.description && (
            <p className="text-xs text-md-on-surface-variant/80 line-clamp-2 max-w-2xl">
              {detail.description}
            </p>
          )}

          {detail.tracks.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={handlePlayAll}
                className="px-6 py-2.5 rounded-full bg-md-primary text-md-on-primary font-bold text-sm shadow-lg hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play All ({detail.tracks.length})</span>
              </button>
              <button
                onClick={handleShuffleAll}
                className="px-5 py-2.5 rounded-full bg-md-secondary-container text-md-on-secondary-container font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist Table */}
      {detail.tracks.length > 0 && (
        <div className="space-y-2">
          <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center justify-between border-b border-md-outline-variant/20">
            <span># &nbsp; Title</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Duration
            </span>
          </div>

          <div className="divide-y divide-md-outline-variant/10">
            {detail.tracks.map((track, idx) => {
              const isPlaying = currentTrack?.videoId === track.videoId;
              const liked = isTrackLiked(track.videoId);
              return (
                <div
                  key={`${track.videoId}-${idx}`}
                  className={`group flex items-center gap-3.5 px-3.5 py-2.5 rounded-m3-md transition-all ${
                    isPlaying
                      ? 'bg-md-primary-container/45 text-md-primary'
                      : 'hover:bg-md-surface-container-high'
                  }`}
                >
                  <span className="w-6 text-center font-mono-num text-xs text-md-on-surface-variant group-hover:hidden">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => onPlayTrack(track, detail.tracks)}
                    className="w-6 hidden group-hover:flex items-center justify-center text-md-primary"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>

                  <div
                    onClick={() => onPlayTrack(track, detail.tracks)}
                    className="w-10 h-10 rounded-m3-sm overflow-hidden bg-md-surface-container-highest shrink-0 cursor-pointer"
                  >
                    <img
                      src={track.thumbnail || detail.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div
                    onClick={() => onPlayTrack(track, detail.tracks)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-sm font-bold truncate flex items-center gap-1.5">
                      <span>{track.title}</span>
                      {track.explicit && (
                        <span className="px-1 py-0.2 text-[9px] rounded bg-md-surface-container-highest text-md-on-surface-variant font-bold">
                          E
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-md-on-surface-variant truncate">
                      {track.artist} {track.plays ? `• ${track.plays}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleLike(track)}
                      className={`p-1.5 rounded-full hover:bg-md-surface-container-highest transition-colors ${
                        liked
                          ? 'text-rose-400'
                          : 'text-md-on-surface-variant opacity-0 group-hover:opacity-100'
                      }`}
                      title="Save to Liked Songs"
                    >
                      <Heart
                        className={`w-4 h-4 ${liked ? 'fill-rose-400' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => onAddTrackToPlaylist(track)}
                      className="p-1.5 rounded-full hover:bg-md-surface-container-highest text-md-on-surface-variant opacity-0 group-hover:opacity-100 transition-colors"
                      title="Add to custom playlist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-right font-mono-num text-xs text-md-on-surface-variant">
                      {track.duration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Artist Discography / Related Carousels */}
      {detail.shelves.map((shelf) => (
        <div key={shelf.id} className="space-y-3">
          <h3 className="text-lg font-extrabold text-md-on-surface">
            {shelf.title}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {shelf.items.slice(0, 10).map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                onClick={() => {
                  if (item.videoId) onPlayTrack(item);
                  else if (item.browseId) onBrowseItem(item.browseId);
                }}
                className="group p-3 rounded-m3-lg bg-md-surface-container hover:bg-md-surface-container-high border border-md-outline-variant/20 cursor-pointer transition-all"
              >
                <div className="relative aspect-square rounded-m3-md overflow-hidden mb-2.5 bg-md-surface-container-highest">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-md-primary opacity-40" />
                    </div>
                  )}
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
        </div>
      ))}
    </div>
  );
};
