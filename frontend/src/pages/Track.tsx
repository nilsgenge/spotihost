import { Link, useParams } from "react-router-dom";
import { useTrackDetails } from "../hooks/useTrackDetails";
import ElementBlock from "../components/ui/ElementBlock";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import { formatDuration } from "../utils/utils";
import DateRangePicker from "../components/blocks/DateRangePicker";
import {
  SkipRatePieDiagram,
  CompletionRatePieDiagram,
} from "../components/charts/PieDiagrams";
import {
  DayOfWeekBarDiagram,
  MonthBarDiagram,
  YearBarDiagram,
} from "../components/charts/PlaysBarDiagrams";
import { TrackPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import ContentBlock from "../components/ui/ContentBlock";

const Track = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { track, loading, error } = useTrackDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!track) return <div className="container">Track not found</div>;

  const isSingleArtist = track.artists.length === 1;
  const artistOuterColClass = isSingleArtist ? "col-lg-6" : "col-lg-7";
  const albumOuterColClass = isSingleArtist ? "col-lg-6" : "col-lg-5";
  const artistItemColClass = isSingleArtist ? "col-12" : "col-6";

  return (
    <div className="container">
      {/* Breadcrumb */}
      <TrackBreadcrumb
        item1={{
          name: track.album.name,
          type: "album",
          spotify_id: track.album.spotify_id,
        }}
        item2={track.name}
      />

      {/* Hero Section */}
      <div className="row align-items-center g-4 mb-4">
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

            <div className="d-flex flex-wrap gap-4 mt-3 small">
              <div>
                <span className="fw-bold">Duration</span>:{" "}
                {formatDuration(track.duration_s)}
              </div>
              <div>
                <span className="fw-bold">Popularity</span>: {track.popularity}
                /100
              </div>
              <div>
                <span className="fw-bold">Listens</span>: {track.listen_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Artists & Album Section */}
      <div className="row g-4 mb-4">
        <div className={`col-12 ${artistOuterColClass}`}>
          <h2 className="h5 mb-3">Artists</h2>
          <div className="row g-2">
            {track.artists.map((artist) => (
              <div className={artistItemColClass} key={artist.spotify_id}>
                <ElementBlock
                  image={artist.image_url}
                  title={artist.name}
                  title_url={`/artist/${artist.spotify_id}`}
                  stat={`${artist.listen_count} Listens`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={`col-12 ${albumOuterColClass}`}>
          <h2 className="h5 mb-3">Appears on</h2>
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
      </div>

      <Separator />

      {/* Stats Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Extra Stats</h2>
        </div>
        <div className="row mb-4 text-center">
          <DateRangePicker />
        </div>

        <div className="row g-4">
          {/* Listening Activity - Full Width */}
          <div className="col-12">
            <ContentBlock title="Listening Activity">
              <TrackPlaysLineDiagram
                trackId={spotify_id!}
                trackName={track.name}
              />
            </ContentBlock>
          </div>

          {/* Pie Charts */}
          <div className="col-12 col-lg-6">
            <ContentBlock title="Skip Rate - Alltime">
              <SkipRatePieDiagram
                donut={true}
                filters={{ trackId: spotify_id }}
                height={500}
                allTime
              />
            </ContentBlock>
          </div>
          <div className="col-12 col-lg-6">
            <ContentBlock title="Completion Rate - Alltime">
              <CompletionRatePieDiagram
                donut={true}
                filters={{ trackId: spotify_id }}
                height={500}
                allTime
              />
            </ContentBlock>
          </div>

          {/* Bar Charts */}
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Day - Alltime">
              <DayOfWeekBarDiagram trackId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Month - Alltime">
              <MonthBarDiagram trackId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Year - Alltime">
              <YearBarDiagram trackId={spotify_id} allTime />
            </ContentBlock>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Track;
