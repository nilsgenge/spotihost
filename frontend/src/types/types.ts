
export type RankingType = "artists" | "tracks" | "albums";



export interface ArtistLink {
  name: string;
  url: string;
}

export interface SimpleArtist {
  artist_id: number;
  spotify_id: string;
  name: string;
  image_url: string;
  listen_count: number;
}

export interface SimpleTrack {
  track_id: number;
  spotify_id: string;
  name: string;
  cover_url: string;
  listen_count: number;
  artists: ArtistLink[];
}

export interface SimpleAlbum {
  album_id: number;
  spotify_id: string;
  name: string;
  cover_url: string;
  listen_count: number;
  artists: ArtistLink[];
}

export interface Listen {
  listen_id: number;
  track_id: number;
  track_spotify_id: string;
  played_at: string;
  formatted_time: string;
  track_name: string;
  cover_url?: string;
  artists: ArtistLink[];
}

export interface AdvancedTrack {
  name: string;
  artists: SimpleArtist[];
  albums: SimpleAlbum[];
  image_url: string;
  duration_s: number;
  popularity: number;
  external_urls: Record<string, string>;
  listen_count: number;
}

export interface AdvancedAlbum {
  name: string;
  artists: SimpleArtist[];
  release_date: string;
  total_tracks: number;
  image_url: string;
  popularity: number;
  listen_count: number;
  tracks: SimpleTrack[];
}

export interface AdvancedArtist {
  spotify_id: string;
  name: string;
  image_url: string;
  followers: number;
  genres: string[];
  popularity: number;
  listen_count: number;
}