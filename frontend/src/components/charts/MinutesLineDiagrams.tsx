import { LineDiagram } from "./LineDiagram";
import {
  useTotalMinutes,
  useArtistMinutes,
  useAlbumMinutes,
  useTrackMinutes,
} from "../../hooks/useMinutesCharts";

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-music-note-beamed fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="me-2" role="status" />
    {label && <span className="text-soft">{label}</span>}
  </div>
);

const minutesFormatter = (val: number | null): string => {
  if (!val || val === 0) return "No Listens";
  return `${val} min`;
};

interface BaseProps {
  height?: number;
  color?: string;
}

export const TotalMinutesLineDiagram: React.FC<BaseProps> = ({
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTotalMinutes();

  if (loading) return <LoadingState />;
  if (data.length === 0)
    return <EmptyState message="No listening data in selected timeframe" />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={minutesFormatter} />
  );
};

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
  if (data.length === 0)
    return <EmptyState message={`No listening data for ${artistName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={minutesFormatter} />
  );
};

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
  if (data.length === 0)
    return <EmptyState message={`No listening data for ${albumName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={minutesFormatter} />
  );
};

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
  if (data.length === 0)
    return <EmptyState message={`No listening data for ${trackName}`} />;

  return (
    <LineDiagram data={data} color={color} valueFormatter={minutesFormatter} />
  );
};
