import { useState, useEffect } from 'react';


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
  type: 'track';
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
  type: 'episode';
}

interface Context {
  type: 'album' | 'artist' | 'playlist' | 'show' | 'collection';
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
  repeat_state: 'off' | 'track' | 'context';
}

export interface UsePlayerReturn {
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  deviceType: string;
  songName: string;
  artistName: string;
  imageUrl: string;
  isExplicit: boolean;
  songUrl: string;
  contextType: string | null;
  contextUrl: string | null;
}

export const usePlayerDetails = (): UsePlayerReturn => {
  const [status, setStatus] = useState<{
    isLoading: boolean;
    error: string | null;
    data: UsePlayerReturn;
  }>({
    isLoading: true,
    error: null,
    data: {
      isLoading: true,
      error: null,
      isPlaying: false,
      shuffleState: false,
      repeatState: 'off',
      deviceType: 'Unknown',
      songName: '',
      artistName: '',
      imageUrl: '',
      isExplicit: false,
      songUrl: '#',
      contextType: null,
      contextUrl: null,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(`${API_URL}/currently-playing`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: PlayerData = await response.json();

        if (!data.item) {
          setStatus({
            isLoading: false,
            error: null,
            data: {
              isLoading: false,
              error: null,
              isPlaying: false,
              shuffleState: false,
              repeatState: 'off',
              deviceType: data.device?.type || '-',
              songName: 'Nothing Playing',
              artistName: '-',
              imageUrl: '',
              isExplicit: false,
              songUrl: '#',
              contextType: null,
              contextUrl: null,
            },
          });
          return;
        }

        const item = data.item;
        let songName = '';
        let artistName = '';
        let imageUrl = '';
        let isExplicit = false;
        let songUrl = item.external_urls.spotify;

        if (item.type === 'track') {
          songName = item.name;
          artistName = item.artists.map((a) => a.name).join(', ');
          isExplicit = item.explicit;
          
          const targetImage = item.album.images.find(img => img.height === 64) || 
                              item.album.images.reduce((prev, curr) => 
                                (prev.height && curr.height && prev.height < curr.height) ? prev : curr
                              , item.album.images[0]);
          
          imageUrl = targetImage?.url || '';
        } else if (item.type === 'episode') {
          songName = item.name;
          artistName = item.show.publisher;
          isExplicit = false; 

          const targetImage = item.show.images.find(img => img.height === 64) || 
                              item.show.images.reduce((prev, curr) => 
                                (prev.height && curr.height && prev.height < curr.height) ? prev : curr
                              , item.show.images[0]);
          
          imageUrl = targetImage?.url || '';
        }

        let contextType = null;
        let contextUrl = null;

        if (data.context) {
          contextType = data.context.type;
          contextUrl = data.context.external_urls?.spotify || null;
        }

        setStatus({
          isLoading: false,
          error: null,
          data: {
            isLoading: false,
            error: null,
            isPlaying: data.is_playing,
            shuffleState: data.shuffle_state,
            repeatState: data.repeat_state,
            deviceType: data.device?.type || 'Unknown',
            songName,
            artistName,
            imageUrl,
            isExplicit,
            songUrl,
            contextType,
            contextUrl,
          },
        });

      } catch (err) {
        console.error(err);
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to fetch player details',
          data: { ...prev.data, isLoading: false, error: 'Failed to fetch player details' }
        }));
      }
    };

    fetchData();

    window.addEventListener('focus', fetchData);
    
    return () => {
      window.removeEventListener('focus', fetchData);
    };
    
  }, []);

  return status.data;
};