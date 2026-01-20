import { Link, useParams } from "react-router-dom";
import { useTrackDetails } from "../hooks/useTrackDetails";
import ElementBlock from "../components/ui/ElementBlock";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import { formatDuration } from "../utils/utils";

const Track = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { track, loading, error } = useTrackDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!track) return <div className="container">Track not found</div>;

  return (
    <div className="container">
      <TrackBreadcrumb
        item1={{
          name: track.album.name,
          type: "album",
          spotify_id: track.album.spotify_id,
        }}
        item2={track.name}
      />

      <div className="row align-items-center mb-5">
        <div className="col-auto">
          <img
            src={track.image_url}
            alt={track.name}
            className="rounded-3 shadow detail-image"
          />
        </div>

        <div className="col">
          <div className="d-flex flex-column gap-2">
            <h1 className="fw-bold mb-0">{track.name}</h1>
            <div className="d-flex flex-wrap gap-2">
              {track.artists.map((artist, index) => (
                <span key={artist.spotify_id}>
                  <Link
                    to={`/artist/${artist.spotify_id}`}
                    className="hover-underline text-reset"
                  >
                    {artist.name}
                  </Link>
                  {index < track.artists.length - 1 && ", "}
                </span>
              ))}
            </div>

            <div className="d-flex align-items-center gap-3 mt-2">
              <SpotifyButton type="track" spotifyId={spotify_id} />
            </div>

            <div className="d-flex flex-wrap gap-4 mt-3">
              <div>
                <strong>Duration</strong>: {formatDuration(track.duration_s)}
              </div>
              <div>
                <strong>Popularity</strong>: {track.popularity}/100
              </div>
              <div>
                <strong>Listens</strong>: {track.listen_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <h2 className="h4 mb-3">Artists</h2>
      <div className="d-flex flex-column gap-2 mb-4">
        {track.artists.map((artist) => (
          <ElementBlock
            key={artist.spotify_id}
            image={artist.image_url}
            title={artist.name}
            title_url={`/artist/${artist.spotify_id}`}
            stat={`${artist.listen_count} Listens`}
          />
        ))}
      </div>

      <h2 className="h4 mb-3">Appears on</h2>
      <div className="d-flex flex-column gap-2">
        <ElementBlock
          key={track.album.spotify_id}
          image={track.album.cover_url}
          title={track.album.name}
          title_url={`/album/${track.album.spotify_id}`}
          label={track.album.artists}
          stat={`${track.album.listen_count} Listens`}
        />
      </div>
    </div>
  );
};

export default Track;
