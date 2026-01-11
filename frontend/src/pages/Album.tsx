import { Link, useParams } from "react-router-dom";
import { useAlbumDetails } from "../hooks/useAlbumDetails";
import ElementBlock from "../components/ui/ElementBlock";
import Separator from "../components/blocks/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";

const Album = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { album, loading, error } = useAlbumDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!album) return <div className="container">Album not found</div>;

  return (
    <div className="container">
      <TrackBreadcrumb
        item1={{
          name: album.name,
          type: "album",
          spotify_id: spotify_id,
        }}
      />

      <div className="row align-items-center mb-5">
        <div className="col-auto">
          <img
            src={album.image_url}
            alt={album.name}
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
            <h1 className="fw-bold mb-0">{album.name}</h1>

            <div className="d-flex flex-wrap gap-2">
              {album.artists.map((artist, index) => (
                <span key={artist.spotify_id}>
                  <Link
                    to={`/artist/${artist.spotify_id}`}
                    className="hover-underline text-reset"
                  >
                    {artist.name}
                  </Link>
                  {index < album.artists.length - 1 && ", "}
                </span>
              ))}
            </div>

            <div className="d-flex align-items-center gap-3 mt-2">
              <SpotifyButton type="album" spotifyId={spotify_id} />
            </div>

            <div className="d-flex flex-wrap gap-4 mt-3">
              <div>
                <strong>Released</strong>: {album.release_date.split("-")[0]}
              </div>
              <div>
                <strong>Total Tracks</strong>: {album.total_tracks}
              </div>
              <div>
                <strong>Popularity</strong>: {album.popularity}/100
              </div>
              <div>
                <strong>Listens</strong>: {album.listen_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <h2 className="h4 mb-3">Artists</h2>
      <div className="d-flex flex-column gap-2 mb-4">
        {album.artists.map((artist) => (
          <ElementBlock
            key={artist.spotify_id}
            image={artist.image_url}
            title={artist.name}
            title_url={`/artist/${artist.spotify_id}`}
            stat={`${artist.listen_count} Listens`}
          />
        ))}
      </div>

      <h2 className="h4 mb-3">Tracks from database</h2>
      <div className="d-flex flex-column gap-2">
        {album.tracks.map((track) => (
          <ElementBlock
            key={track.spotify_id}
            image={album.image_url}
            title={track.name}
            title_url={`/track/${track.spotify_id}`}
            label={track.artists}
            stat={`${track.listen_count} Listens`}
          />
        ))}
      </div>
    </div>
  );
};

export default Album;
