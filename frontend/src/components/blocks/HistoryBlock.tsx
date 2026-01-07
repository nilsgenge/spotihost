import { useRecentListens, type Listen } from "../../hooks/useRecentListens";
import ContentBlock from "../ui/ContentBlock";
import ElementBlock from "../ui/ElementBlock";

const HistoryBlock = () => {
  const { listens, loading } = useRecentListens(20);

  if (loading) {
    return (
      <ContentBlock title={"History"}>
        <div style={{ padding: "10px", color: "var(--bs-secondary)" }}>
          Loading...
        </div>
      </ContentBlock>
    );
  }

  if (listens.length === 0) {
    return (
      <ContentBlock title={"History"}>
        <div style={{ padding: "10px", color: "var(--bs-secondary)" }}>
          No recent history
        </div>
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
            label={listen.artist_names}
            stat={listen.formatted_time}
          />
        ))}
      </div>
    </ContentBlock>
  );
};

export default HistoryBlock;
