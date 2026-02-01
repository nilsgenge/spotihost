import { LineDiagram } from "./LineDiagram";
import {
  useTotalPlays,
  useArtistPlays,
  useAlbumPlays,
  useTrackPlays,
} from "../../hooks/usePlaysCharts";

// Shared components
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-play-circle fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="me-2" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    {label && <span className="text-soft">{label}</span>}
  </div>
);

const playsFormatter = (val: number | null): string => {
  if (!val || val === 0) return "No Plays";
  return `${val} plays`;
};

interface BaseProps {
  height?: number;
  color?: string;
}

// Total Plays
export const TotalPlaysLineDiagram: React.FC<BaseProps> = ({
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTotalPlays();

  if (loading) return <LoadingState />;

  const hasData = data.length > 0;
  if (!hasData) return <EmptyState message="No plays in selected timeframe" />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={playsFormatter} />
  );
};

// Artist Plays
interface ArtistProps extends BaseProps {
  artistId: string;
  artistName: string;
}

export const ArtistPlaysLineDiagram: React.FC<ArtistProps> = ({
  artistId,
  artistName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useArtistPlays(artistId);

  if (loading) return <LoadingState label={`Loading ${artistName}...`} />;

  const hasData = data.length > 0;
  if (!hasData) return <EmptyState message={`No plays for ${artistName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={playsFormatter} />
  );
};

// Album Plays
interface AlbumProps extends BaseProps {
  albumId: string;
  albumName: string;
}

export const AlbumPlaysLineDiagram: React.FC<AlbumProps> = ({
  albumId,
  albumName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useAlbumPlays(albumId);

  if (loading) return <LoadingState label={`Loading ${albumName}...`} />;

  const hasData = data.length > 0;
  if (!hasData) return <EmptyState message={`No plays for ${albumName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={playsFormatter} />
  );
};

// Track Plays
interface TrackProps extends BaseProps {
  trackId: string;
  trackName: string;
}

export const TrackPlaysLineDiagram: React.FC<TrackProps> = ({
  trackId,
  trackName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTrackPlays(trackId);

  if (loading) return <LoadingState label={`Loading ${trackName}...`} />;

  const hasData = data.length > 0;
  if (!hasData) return <EmptyState message={`No plays for ${trackName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={playsFormatter} />
  );
};
