import { useState, useEffect, useCallback } from "react";

interface Artist {
  name: string;
}

interface Image {
  url: string;
  height: number | null;
  width: number | null;
}

interface Album {
  name: string;
  images: Image[];
}

interface SpotifyExternalUrls {
  spotify: string;
}

interface Track {
  name: string;
  external_urls: SpotifyExternalUrls;
  album: Album;
  artists: Artist[];
  duration_ms: number;
  explicit: boolean;
  type: "track";
}

interface Episode {
  name: string;
  external_urls: SpotifyExternalUrls;
  show: {
    name: string;
    publisher: string;
    images: Image[];
  };
  duration_ms: number;
  type: "episode";
}

interface Context {
  type: "album" | "artist" | "playlist" | "show" | "collection";
  uri: string;
  external_urls?: SpotifyExternalUrls;
  href?: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
}

interface PlayerData {
  is_playing: boolean;
  item: Track | Episode | null;
  device: Device;
  context: Context | null;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
}

export interface UsePlayerReturn {
  playerActive: boolean;
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  shuffleState: boolean;
  repeatState: "off" | "track" | "context";
  deviceType: string;
  songName: string;
  artistName: string;
  imageUrl: string;
  isExplicit: boolean;
  songUrl: string;
  contextType: string | null;
  contextUrl: string | null;
  refetch: () => Promise<void>;
}

export const usePlayerDetails = (): UsePlayerReturn => {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [status, setStatus] = useState<UsePlayerReturn>({
    playerActive: false,
    isLoading: true,
    error: null,
    isPlaying: false,
    shuffleState: false,
    repeatState: "off",
    deviceType: "Unknown",
    songName: "",
    artistName: "",
    imageUrl: "",
    isExplicit: false,
    songUrl: "#",
    contextType: null,
    contextUrl: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    try {
      // Only show loading state if this is the first load
      if (!hasLoadedOnce) {
        setStatus((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      const response = await fetch(`/api/currently-playing`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PlayerData = await response.json();

      // Nothing playing (204 response or no item)
      if (!data.item) {
        setStatus((prev) => ({
          ...prev,
          playerActive: false,
          isLoading: false,
          error: null,
          isPlaying: false,
          shuffleState: false,
          repeatState: "off",
          deviceType: data.device?.type || "-",
          songName: "Nothing Playing",
          artistName: "-",
          imageUrl: "",
          isExplicit: false,
          songUrl: "#",
          contextType: null,
          contextUrl: null,
        }));
        setHasLoadedOnce(true);
        return;
      }

      const item = data.item;
      let songName = "";
      let artistName = "";
      let imageUrl = "";
      let isExplicit = false;
      const songUrl = item.external_urls.spotify;

      if (item.type === "track") {
        songName = item.name;
        artistName = item.artists.map((a) => a.name).join(", ");
        isExplicit = item.explicit;
        imageUrl =
          item.album.images.length > 0
            ? item.album.images[item.album.images.length - 1].url
            : "";
      } else if (item.type === "episode") {
        songName = item.name;
        artistName = item.show.publisher;
        imageUrl =
          item.show.images.length > 0
            ? item.show.images[item.show.images.length - 1].url
            : "";
      }

      let contextType = null;
      let contextUrl = null;

      if (data.context) {
        contextType = data.context.type;
        contextUrl = data.context.external_urls?.spotify || null;
      }

      setStatus((prev) => ({
        ...prev,
        playerActive: true,
        isLoading: false,
        error: null,
        isPlaying: data.is_playing,
        shuffleState: data.shuffle_state,
        repeatState: data.repeat_state,
        deviceType: data.device?.type || "Unknown",
        songName,
        artistName,
        imageUrl,
        isExplicit,
        songUrl,
        contextType,
        contextUrl,
      }));

      setHasLoadedOnce(true);
    } catch (err) {
      console.error("Failed to fetch player details:", err);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to fetch player details",
      }));
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    setStatus((prev) => ({ ...prev, refetch: fetchData }));
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    window.addEventListener("focus", fetchData);

    return () => {
      window.removeEventListener("focus", fetchData);
    };
  }, [fetchData]);

  return status;
};
