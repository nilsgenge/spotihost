import React from "react";
import { useParams } from "react-router-dom";
import { useArtistDetails } from "../hooks/useArtistDetails";
import Separator from "../components/ui/Separator";
import { SpotifyButton } from "../components/ui/SpotifyButton";
import { formatFollowers } from "../utils/utils";
import { TrackBreadcrumb } from "../components/ui/Breadcrumbs";
import ElementBlock from "../components/ui/ElementBlock";
import {
  SkipRatePieDiagram,
  CompletionRatePieDiagram,
} from "../components/charts/PieDiagrams";
import ContentBlock from "../components/ui/ContentBlock";
import DateRangePicker from "../components/blocks/DateRangePicker";
import { ArtistPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import {
  DayOfWeekBarDiagram,
  MonthBarDiagram,
  YearBarDiagram,
} from "../components/charts/PlaysBarDiagrams";

const Artist: React.FC = () => {
  const { spotify_id } = useParams<{ spotify_id: string }>();
  const { artist, loading, error } = useArtistDetails(spotify_id);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container text-danger">{error}</div>;
  if (!artist) return <div className="container">Artist not found</div>;

  const MAX_DISPLAY_ITEMS = 50;

  const displayedTracks = artist.tracks.slice(0, MAX_DISPLAY_ITEMS);
  const hasMoreTracks = artist.tracks.length > MAX_DISPLAY_ITEMS;

  const displayedAlbums = artist.albums.slice(0, MAX_DISPLAY_ITEMS);
  const hasMoreAlbums = artist.albums.length > MAX_DISPLAY_ITEMS;

  return (
    <div className="container">
      {/* Breadcrumb */}
      <TrackBreadcrumb
        item1={{
          name: artist.name,
          type: "artist",
          spotify_id: artist.spotify_id,
        }}
      />

      {/* Hero Section */}
      <div className="row align-items-center g-4 mb-4">
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

            <div className="d-flex flex-wrap gap-4 mt-3 small">
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
              <div className="d-flex flex-wrap gap-4 mt-3 small">
                <div>
                  <strong>Genres</strong>: {artist.genres.join(", ")}
                </div>
              </div>
            )}
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
          {/* Listening Activity */}
          <div className="col-12">
            <ContentBlock title="Listening Activity">
              <ArtistPlaysLineDiagram
                artistId={spotify_id!}
                artistName={artist.name}
              />
            </ContentBlock>
          </div>

          {/* Pie Charts */}
          <div className="col-12 col-lg-6">
            <ContentBlock title="Skip Rate - Alltime">
              <SkipRatePieDiagram
                donut={true}
                filters={{ artistId: spotify_id }}
                allTime
              />
            </ContentBlock>
          </div>
          <div className="col-12 col-lg-6">
            <ContentBlock title="Completion Rate - Alltime">
              <CompletionRatePieDiagram
                donut={true}
                filters={{ artistId: spotify_id }}
                allTime
              />
            </ContentBlock>
          </div>

          {/* Bar Charts */}
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Day - Alltime">
              <DayOfWeekBarDiagram artistId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Month - Alltime">
              <MonthBarDiagram artistId={spotify_id} allTime />
            </ContentBlock>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <ContentBlock title="Plays per Year - Alltime">
              <YearBarDiagram artistId={spotify_id} allTime />
            </ContentBlock>
          </div>
        </div>
      </div>

      <Separator />

      <div className="row g-4 mb-4">
        {/* Top Tracks */}
        <div className="col-12 col-lg-6">
          <h2 className="h4 mb-3">Top Tracks</h2>
          <div className="d-flex flex-column gap-2">
            {displayedTracks.map((track) => (
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
          {hasMoreTracks && (
            <div className="text-center text-custom-muted mt-2 small">...</div>
          )}
        </div>

        {/* Top Albums */}
        <div className="col-12 col-lg-6">
          <h2 className="h4 mb-3">Top Albums</h2>
          <div className="d-flex flex-column gap-2">
            {displayedAlbums.map((album) => (
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
          {hasMoreAlbums && (
            <div className="text-center text-custom-muted mt-2 small">...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Artist;
