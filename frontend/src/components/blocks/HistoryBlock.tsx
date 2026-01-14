import { useRecentListens } from "../../hooks/useRecentListens";
import type { Listen } from "../../types/types";
import ContentBlock from "../ui/ContentBlock";
import ElementBlock from "../ui/ElementBlock";

const HistoryBlock = () => {
  const { listens, loading } = useRecentListens(20);

  if (loading) {
    return (
      <ContentBlock title={"History"}>
        <div className="p-3 text-secondary">Loading...</div>
      </ContentBlock>
    );
  }

  if (listens.length === 0) {
    return (
      <ContentBlock title={"History"}>
        <div className="p-3 text-secondary">No recent history</div>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock title={"History"}>
      <div className="d-flex flex-column gap-2">
        {listens.map((listen: Listen) => (
          <ElementBlock
            key={listen.listen_id}
            image={listen.cover_url}
            title={listen.track_name}
            title_url={`/track/${listen.track_spotify_id}`}
            label={listen.artists}
            stat={listen.formatted_time}
          />
        ))}
      </div>
    </ContentBlock>
  );
};

export default HistoryBlock;
