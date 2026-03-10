import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAlbumDetails } from "../hooks/useAlbumDetails";
import ElementBlock from "../components/ui/ElementBlock";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import { capitalizeFirstChar } from "../utils/utils";
import DateRangePicker from "../components/blocks/DateRangePicker";
import ContentBlock from "../components/ui/ContentBlock";
import { AlbumPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import {
  SkipRatePieDiagram,
  CompletionRatePieDiagram,
} from "../components/charts/PieDiagrams";
import {
  DayOfWeekBarDiagram,
  MonthBarDiagram,
  YearBarDiagram,
} from "../components/charts/PlaysBarDiagrams";

const Album: React.FC = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { album, loading, error } = useAlbumDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!album) return <div className="container">Album not found</div>;

  return (
    <div className="container">
      {/* Breadcrumb */}
      <TrackBreadcrumb
        item1={{
          name: album.name,
          type: "album",
          spotify_id: spotify_id,
        }}
      />

      {/* Hero Section */}
      <div className="page-header">
        <div className="row align-items-center g-4">
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

              <div className="d-flex flex-wrap gap-4 mt-3 small">
                <div>
                  <span className="fw-bold">Released</span>:{" "}
                  {album.release_date.split("-")[0]}
                </div>
                <div>
                  <span className="fw-bold">Total Tracks</span>:{" "}
                  {album.total_tracks}
                </div>
                <div>
                  <span className="fw-bold">Popularity</span>:{" "}
                  {album.popularity}/100
                </div>
                <div>
                  <span className="fw-bold">Listens</span>: {album.listen_count}
                </div>
                <div>
                  <span className="fw-bold">Type </span>:{" "}
                  {capitalizeFirstChar(album.album_type)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Artists Section */}
      <div className="mb-4">
        <h2 className="detail-section-header">Artists</h2>
        <div className="d-flex flex-column gap-2">
          {album.artists.map((artist) => (
            <ElementBlock
              key={artist.spotify_id}
              image={artist.image_url}
              title={artist.name}
              title_url={`/artist/${artist.spotify_id}`}
              stat={
                artist.listen_count != 0
                  ? `${artist.listen_count} Listens`
                  : ""
              }
            />
          ))}
        </div>
      </div>

      {/* Tracks Section */}
      <div className="mb-4">
        <h2 className="detail-section-header">Tracks</h2>
        <div className="d-flex flex-column gap-2">
          {album.tracks.map((track, index) => (
            <ElementBlock
              key={track.spotify_id}
              number={index + 1}
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

      <Separator />

      {/* Stats Section */}
      <div className="mb-4">
        <h2 className="detail-section-header">Extra Stats</h2>
        <div className="row page-section">
          <div className="col date-range-picker">
            <DateRangePicker />
          </div>
        </div>

        <div className="row g-4">
          {/* Listening Activity */}
          <div className="col-12">
            <ContentBlock title="Listening Activity">
              <AlbumPlaysLineDiagram
                albumId={spotify_id!}
                albumName={album.name}
              />
            </ContentBlock>
          </div>

          {/* Pie Charts */}
          <div className="col-12 col-lg-6">
            <ContentBlock title="Skip Rate - Alltime">
              <SkipRatePieDiagram
                donut={true}
                filters={{ albumId: spotify_id }}
                height={500}
                allTime
              />
            </ContentBlock>
          </div>
          <div className="col-12 col-lg-6">
            <ContentBlock title="Completion Rate - Alltime">
              <CompletionRatePieDiagram
                donut={true}
                filters={{ albumId: spotify_id }}
                height={500}
                allTime
              />
            </ContentBlock>
          </div>

          {/* Bar Charts */}
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Day - Alltime">
              <DayOfWeekBarDiagram albumId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Month - Alltime">
              <MonthBarDiagram albumId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Year - Alltime">
              <YearBarDiagram albumId={spotify_id} allTime />
            </ContentBlock>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Album;
