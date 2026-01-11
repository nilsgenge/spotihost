import { type FC } from "react";
import ContentBlock from "../ui/ContentBlock";
import ElementBlock from "../ui/ElementBlock";
import { useTopArtists } from "../../hooks/useTopArtists";
import { useTopTracks } from "../../hooks/useTopTracks";
import { useTopAlbums } from "../../hooks/useTopAlbums";

import type {
  SimpleArtist,
  SimpleTrack,
  SimpleAlbum,
  RankingType,
  ArtistLink,
} from "../../types/types";

interface TopRankingBlockProps {
  type: RankingType;
  limit?: number;
  startDate: string;
  endDate: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

const TopRankingBlock: FC<TopRankingBlockProps> = ({
  type,
  limit = 5,
  startDate,
  endDate,
  buttonLabel,
  onButtonClick,
}) => {
  let data: (SimpleArtist | SimpleTrack | SimpleAlbum)[] = [];
  let title = "";
  let loading = false;
  let error: string | null = null;

  if (type === "artists") {
    const result = useTopArtists(startDate, endDate, limit);
    data = result.topArtists;
    loading = result.loading;
    error = result.error;
    title = "Top Artists";
  } else if (type === "tracks") {
    const result = useTopTracks(startDate, endDate, limit);
    data = result.topTracks;
    loading = result.loading;
    error = result.error;
    title = "Top Songs";
  } else if (type === "albums") {
    const result = useTopAlbums(startDate, endDate, limit);
    data = result.topAlbums;
    loading = result.loading;
    error = result.error;
    title = "Top Albums";
  }

  const renderStatusMessage = (message: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100px",
        color: "var(--bs-secondary)",
      }}
    >
      {message}
    </div>
  );

  if (error) {
    return (
      <ContentBlock title={title}>
        {renderStatusMessage("Error loading data")}
      </ContentBlock>
    );
  }

  if (loading) {
    return (
      <ContentBlock title={title}>
        {renderStatusMessage("Loading...")}
      </ContentBlock>
    );
  }

  if (data.length === 0) {
    return (
      <ContentBlock title={title}>
        {renderStatusMessage("No data found")}
      </ContentBlock>
    );
  }

  return (
    <ContentBlock
      title={title}
      buttonLabel={buttonLabel}
      onButtonClick={onButtonClick}
    >
      <div className="d-flex flex-column gap-2">
        {data.map((item) => {
          let title_url: string | undefined;
          let image: string | undefined;
          let label: ArtistLink[] | undefined;

          if (type === "artists") {
            const artist = item as SimpleArtist;
            title_url = `/artist/${artist.spotify_id}`;
            image = artist.image_url;
          } else if (type === "tracks") {
            const track = item as SimpleTrack;
            title_url = `/track/${track.spotify_id}`;
            image = track.cover_url;
            label = track.artists;
          } else if (type === "albums") {
            const album = item as SimpleAlbum;
            title_url = `/album/${album.spotify_id}`;
            image = album.cover_url;
            label = album.artists;
          }

          const key =
            type === "tracks"
              ? (item as SimpleTrack).track_id
              : type === "albums"
              ? (item as SimpleAlbum).album_id
              : (item as SimpleArtist).artist_id;

          return (
            <ElementBlock
              key={key}
              image={image}
              title={item.name}
              title_url={title_url}
              label={label}
              stat={`${item.listen_count} Listens`}
            />
          );
        })}
      </div>
    </ContentBlock>
  );
};

export default TopRankingBlock;
