import { type FC } from "react";
import ContentBlock from "../ui/ContentBlock";
import ElementBlock from "../ui/ElementBlock";
import { useTopArtists, type Artist } from "../../hooks/useTopArtists";
import { useTopTracks, type Track } from "../../hooks/useTopTracks";
import { useTopAlbums, type Album } from "../../hooks/useTopAlbums";

export type RankingType = "artists" | "tracks" | "albums";

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
  let data: (Artist | Track | Album)[] = [];
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
        {data.map((item) => (
          <ElementBlock
            key={
              type === "tracks"
                ? (item as Track).track_id
                : type === "albums"
                ? (item as Album).album_id
                : (item as Artist).artist_id
            }
            image={
              type === "tracks" || type === "albums"
                ? (item as Track | Album).cover_url
                : (item as Artist).image_url
            }
            title={item.name}
            label={
              type === "artists" ? "" : (item as Track | Album).artist_name
            }
            stat={`${item.listen_count.toString()} Listens`}
          />
        ))}
      </div>
    </ContentBlock>
  );
};

export default TopRankingBlock;
