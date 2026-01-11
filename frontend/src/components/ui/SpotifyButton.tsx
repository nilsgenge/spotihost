interface SpotifyButtonProps {
  type: "track" | "album" | "artist";
  spotifyId: string | undefined;
  size?: number;
}

export const SpotifyButton = ({
  type,
  spotifyId,
  size = 28,
}: SpotifyButtonProps) => {
  const url = `https://open.spotify.com/${type}/${spotifyId}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="spotify-btn"
      aria-label="Open in Spotify"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 168 168"
        fill="currentColor"
        aria-hidden
      >
        <path d="M84 0C37.7 0 0 37.7 0 84s37.7 84 84 84 84-37.7 84-84S130.3 0 84 0zm38.6 121.4c-1.6 2.6-5 3.4-7.6 1.8-20.8-12.7-47-15.6-77.9-8.6-3 .7-6-1.1-6.7-4.1-.7-3 1.1-6 4.1-6.7 33.9-7.7 63.2-4.2 86.5 10.2 2.6 1.6 3.4 5 1.8 7.4zm10.9-24.2c-2 3.3-6.3 4.3-9.6 2.3-23.8-14.6-60-18.8-88.1-10.3-3.7 1.1-7.6-1-8.7-4.7-1.1-3.7 1-7.6 4.7-8.7 32.1-9.7 72-5 99.4 12 3.3 2 4.3 6.3 2.3 9.4zm1-25.2C106.7 56.4 64.3 55.6 38.5 63.7c-4.4 1.3-9-1.2-10.3-5.6-1.3-4.4 1.2-9 5.6-10.3 29.7-9 76.5-7.3 108.6 12 4 2.3 5.3 7.4 3 11.4-2.3 4-7.4 5.3-11.4 3z" />
      </svg>
    </a>
  );
};
