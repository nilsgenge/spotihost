import { LineDiagram } from "./LineDiagram";
import {
  useTotalMinutes,
  useArtistMinutes,
  useAlbumMinutes,
  useTrackMinutes,
} from "../../hooks/useMinutesCharts";

// Shared Components
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-music-note-beamed fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="spinner-border spinner-border-sm me-2" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    {label && <span className="text-soft">{label}</span>}
  </div>
);

interface BaseProps {
  color?: string; // Defaults to primary green
}

// Total Minutes
export const TotalMinutesLineDiagram: React.FC<BaseProps> = ({
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTotalMinutes();

  if (loading) return <LoadingState />;

  const hasData = data.some((b) => b.value !== null && b.value > 0);
  if (!hasData)
    return <EmptyState message="No listening data in selected timeframe" />;

  return <LineDiagram data={data} color={color} />;
};

// Artist Minutes
interface ArtistProps extends BaseProps {
  artistId: string;
  artistName: string;
}

export const ArtistMinutesLineDiagram: React.FC<ArtistProps> = ({
  artistId,
  artistName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useArtistMinutes(artistId);

  if (loading) return <LoadingState label={`Loading ${artistName}...`} />;

  const hasData = data.some((b) => b.value !== null && b.value > 0);
  if (!hasData)
    return <EmptyState message={`No listening data for ${artistName}`} />;

  return <LineDiagram data={data} color={color} />;
};

// Album Minutes
interface AlbumProps extends BaseProps {
  albumId: string;
  albumName: string;
}

export const AlbumMinutesLineDiagram: React.FC<AlbumProps> = ({
  albumId,
  albumName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useAlbumMinutes(albumId);

  if (loading) return <LoadingState label={`Loading ${albumName}...`} />;

  const hasData = data.some((b) => b.value !== null && b.value > 0);
  if (!hasData)
    return <EmptyState message={`No listening data for ${albumName}`} />;

  return <LineDiagram data={data} color={color} />;
};

// Track Minutes
interface TrackProps extends BaseProps {
  trackId: string;
  trackName: string;
}

export const TrackMinutesLineDiagram: React.FC<TrackProps> = ({
  trackId,
  trackName,
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTrackMinutes(trackId);

  if (loading) return <LoadingState label={`Loading ${trackName}...`} />;

  const hasData = data.some((b) => b.value !== null && b.value > 0);
  if (!hasData)
    return <EmptyState message={`No listening data for ${trackName}`} />;

  return <LineDiagram data={data} color={color} />;
};
