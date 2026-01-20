import { useParams } from "react-router-dom";
import { useArtistDetails } from "../hooks/useArtistDetails";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { formatFollowers } from "../utils/utils";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import ElementBlock from "../components/ui/ElementBlock";

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
            className="rounded-3 shadow detail-image"
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
            {artist.genres && artist.genres.length > 0 && (
              <div className="d-flex flex-wrap gap-4 mt-3">
                <div>
                  <strong>Genres</strong>: {artist.genres.join(", ")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="d-flex flex-row gap-4">
        <div className="w-50">
          <h2 className="h4 mb-3">Tracks</h2>
          <div className="d-flex flex-column gap-2">
            {artist.tracks.map((track) => (
              <ElementBlock
                key={track.spotify_id}
                image={track.cover_url}
                title={track.name}
                title_url={`/track/${track.spotify_id}`}
                label={track.artists}
                stat={
                  track.listen_count != 0 ? `${track.listen_count} Listens` : ""
                }
              />
            ))}
          </div>
        </div>

        <div className="w-50">
          <h2 className="h4 mb-3">Albums</h2>
          <div className="d-flex flex-column gap-2">
            {artist.albums.map((album) => (
              <ElementBlock
                key={album.spotify_id}
                image={album.cover_url}
                title={album.name}
                title_url={`/album/${album.spotify_id}`}
                stat={
                  album.listen_count != 0 ? `${album.listen_count} Listens` : ""
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Artist;
