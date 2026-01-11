import { useParams } from "react-router-dom";
import { useArtistDetails } from "../hooks/useArtistDetails";
import Separator from "../components/blocks/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { formatFollowers } from "../utils/utils";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";

const Artist = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { artist, loading, error } = useArtistDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!artist) return <div className="container">Artist not found</div>;

  return (
    <div className="container">
      <TrackBreadcrumb
        item1={{
          name: artist.name,
          type: "artist",
          spotify_id: artist.spotify_id,
        }}
      />

      <div className="row align-items-center mb-5">
        <div className="col-auto">
          <img
            src={artist.image_url}
            alt={artist.name}
            className="rounded-3 shadow"
            style={{
              width: "180px",
              height: "180px",
              objectFit: "cover",
            }}
          />
        </div>

        <div className="col">
          <div className="d-flex flex-column gap-2">
            <h1 className="fw-bold mb-0">{artist.name}</h1>

            <div className="d-flex align-items-center gap-3 mt-2">
              <SpotifyButton type="artist" spotifyId={spotify_id} />
            </div>

            <div className="d-flex flex-wrap gap-4 mt-3">
              <div>
                <strong>Followers</strong>: {formatFollowers(artist.followers)}
              </div>
              <div>
                <strong>Popularity</strong>: {artist.popularity}/100
              </div>
              <div>
                <strong>Listens</strong>: {artist.listen_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <h2 className="h4 mb-3">Genres</h2>
      {artist.genres.length > 0 ? (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {artist.genres.map((genre) => (
            <span key={genre} className="badge bg-primary">
              {genre}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-muted small mb-4">No genres available</div>
      )}
    </div>
  );
};

export default Artist;
