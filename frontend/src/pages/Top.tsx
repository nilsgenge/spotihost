import { useDateRange } from "../context/DateRangeContext";
import DateRangePicker from "../components/ui/DateRangePicker";
import Separator from "../components/blocks/Separator";
import ContentBlock from "../components/ui/ContentBlock";
import ElementBlock from "../components/ui/ElementBlock";
import { useTopArtists } from "../hooks/useTopArtists";
import { useTopTracks } from "../hooks/useTopTracks";
import { useTopAlbums } from "../hooks/useTopAlbums";

const Top = () => {
  const { startDate, endDate } = useDateRange();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const limit = 30;

  const {
    topArtists,
    loading: artistsLoading,
    error: artistsError,
  } = useTopArtists(startISO, endISO, limit);
  const {
    topTracks,
    loading: tracksLoading,
    error: tracksError,
  } = useTopTracks(startISO, endISO, limit);
  const {
    topAlbums,
    loading: albumsLoading,
    error: albumsError,
  } = useTopAlbums(startISO, endISO, limit);

  return (
    <div className="container">
      <h1>Top</h1>
      <div className="row mb-4 text-center">
        <DateRangePicker />
      </div>

      <Separator />

      <div className="row mb-4 text-center">
        {/* --- Top Artists --- */}
        <div className="col">
          <ContentBlock
            title={"Top Artists"}
            buttonLabel="Show more"
            onButtonClick={() => window.open("https://spotify.com", "_blank")}
            loading={artistsLoading}
            error={artistsError}
          >
            <div className="d-flex flex-column gap-2">
              {topArtists.map((artist) => (
                <ElementBlock
                  key={artist.artist_id}
                  image={artist.image_url}
                  title={artist.name}
                  label={""}
                  stat={`${artist.listen_count} Listens`}
                />
              ))}
            </div>
          </ContentBlock>
        </div>

        {/* --- Top Songs --- */}
        <div className="col">
          <ContentBlock
            title={"Top Songs"}
            buttonLabel="Show more"
            onButtonClick={() => window.open("https://spotify.com", "_blank")}
            loading={tracksLoading}
            error={tracksError}
          >
            <div className="d-flex flex-column gap-2">
              {topTracks.map((track) => (
                <ElementBlock
                  key={track.track_id}
                  image={track.cover_url}
                  title={track.name}
                  label={""}
                  stat={`${track.listen_count} Listens`}
                />
              ))}
            </div>
          </ContentBlock>
        </div>

        {/* --- Top Albums --- */}
        <div className="col">
          <ContentBlock
            title={"Top Albums"}
            buttonLabel="Show more"
            onButtonClick={() => window.open("https://spotify.com", "_blank")}
            loading={albumsLoading}
            error={albumsError}
          >
            <div className="d-flex flex-column gap-2">
              {topAlbums.map((album) => (
                <ElementBlock
                  key={album.album_id}
                  image={album.cover_url}
                  title={album.name}
                  label={""}
                  stat={`${album.listen_count} Listens`}
                />
              ))}
            </div>
          </ContentBlock>
        </div>
      </div>
    </div>
  );
};

export default Top;
