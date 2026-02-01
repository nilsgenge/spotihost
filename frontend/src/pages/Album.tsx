import { Link, useParams } from "react-router-dom";
import { useAlbumDetails } from "../hooks/useAlbumDetails";
import ElementBlock from "../components/ui/ElementBlock";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import { capitalizeFirstChar } from "../utils/utils";
import DateRangePicker from "../components/blocks/DateRangePicker";
import { AlbumPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import ContentBlock from "../components/ui/ContentBlock";
import {
  SkipRatePieDiagram,
  CompletionRatePieDiagram,
} from "../components/charts/PieDiagrams";
import {
  DayOfWeekBarDiagram,
  MonthBarDiagram,
  YearBarDiagram,
} from "../components/charts/PlaysBarDiagrams";

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
            className="rounded-3 shadow detail-image"
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
              <div>
                <strong>Type</strong>: {capitalizeFirstChar(album.album_type)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />
      <div className="row mb-3 text-center">
        <DateRangePicker />
      </div>

      <div className="row mb-3">
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Listening Activity">
            <AlbumPlaysLineDiagram
              albumId={spotify_id!}
              albumName={album.name}
            />
          </ContentBlock>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Skip Rate - Alltime">
            <SkipRatePieDiagram
              donut={true}
              filters={{ albumId: spotify_id }}
              allTime
            />
          </ContentBlock>
        </div>
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Completion Rate - Alltime">
            <CompletionRatePieDiagram
              donut={true}
              filters={{ albumId: spotify_id }}
              allTime
            />
          </ContentBlock>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Plays per Day - Alltime">
            <DayOfWeekBarDiagram albumId={spotify_id} allTime />
          </ContentBlock>
        </div>
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Plays per Month - Alltime">
            <MonthBarDiagram albumId={spotify_id} allTime />
          </ContentBlock>
        </div>
        <div className="col d-flex flex-wrap gap-3">
          <ContentBlock title="Plays per Year - Alltime">
            <YearBarDiagram albumId={spotify_id} allTime />
          </ContentBlock>
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
            stat={
              artist.listen_count != 0 ? `${artist.listen_count} Listens` : ""
            }
          />
        ))}
      </div>

      <h2 className="h4 mb-3">Tracks</h2>
      <div className="d-flex flex-column gap-2">
        {album.tracks.map((track) => (
          <ElementBlock
            key={track.spotify_id}
            image={album.image_url}
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
  );
};

export default Album;
