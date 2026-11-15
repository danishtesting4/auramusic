export type ItemType = 'song' | 'video' | 'album' | 'artist' | 'playlist';

export interface TrackItem {
  id: string;
  videoId?: string | null;
  browseId?: string | null;
  type: ItemType;
  title: string;
  artist: string;
  album?: string;
  subtitle?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  plays?: string;
  explicit?: boolean;
  sponsorBlockBadge?: string;
}

export type SponsorCategory =
  | 'music_offtopic'
  | 'sponsor'
  | 'intro'
  | 'outro'
  | 'selfpromo'
  | 'interaction'
  | 'preview';

export type SponsorBehavior = 'autoskip' | 'manual' | 'seekbar' | 'off';

export interface SponsorBlockSegment {
  uuid: string;
  category: SponsorCategory;
  actionType: string;
  startTime: number;
  endTime: number;
  videoDuration: number;
  votes: number;
}

export interface SponsorCategorySetting {
  category: SponsorCategory;
  label: string;
  description: string;
  color: string;
  behavior: SponsorBehavior;
}

export interface RYDStats {
  id: string;
  likes: number;
  dislikes: number;
  rawLikes?: number;
  rawDislikes?: number;
  viewCount: number;
  rating: number;
  likePercentage: number;
  dateCreated?: string;
}

export interface SyncedLyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  source: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  hasSynced: boolean;
  syncedLines: SyncedLyricLine[];
  plainLyrics: string;
}

export interface AudioStreamInfo {
  directUrl: string;
  proxiedUrl: string;
  codec: string;
  matchedTrack: string;
  artworkUrl?: string;
}

export interface TrackContextData {
  videoId: string;
  musicVideoId: string;
  title: string;
  artist: string;
  innertubeClient: string;
  sponsorBlock: {
    videoId: string;
    segmentCount: number;
    segments: SponsorBlockSegment[];
  };
  returnYouTubeDislike: RYDStats;
  lyrics: LyricsData;
  audioStream: AudioStreamInfo | null;
  upNext: TrackItem[];
}

export interface HomeShelf {
  id: string;
  title: string;
  subtitle?: string;
  type: 'showcase' | 'songs' | 'cards';
  items: TrackItem[];
}

export interface BrowseDetail {
  browseId: string;
  kind: 'album' | 'playlist' | 'artist';
  title: string;
  artist: string;
  subtitle: string;
  secondSubtitle?: string;
  description?: string;
  thumbnail: string;
  tracks: TrackItem[];
  shelves: { id: string; title: string; items: TrackItem[] }[];
}

export interface CustomPlaylist {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  tracks: TrackItem[];
}

export type PlaybackEngineMode = 'direct_audio' | 'youtube_embed';
