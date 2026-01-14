import { FaHistory } from "react-icons/fa";
import useLastActive from "../../hooks/useLastActive";
import { useRecentListens } from "../../hooks/useRecentListens";
import { usePlayerDetails } from "../../hooks/usePlayerDetails";
import StatBlock from "../ui/StatBlock";

const StatsLastActiveBlock = () => {
  const { listens, loading: recentsLoading } = useRecentListens(10);
  const latestTimestamp =
    !recentsLoading && listens.length > 0 ? listens[0].played_at : null;
  const playerData = usePlayerDetails();
  const { value, title, loading, error } = useLastActive(
    latestTimestamp ? new Date(latestTimestamp) : null,
    playerData
  );

  if (error) {
    return <StatBlock icon={<FaHistory />} title="Last Active" value="Error" />;
  }

  return (
    <StatBlock
      icon={<FaHistory />}
      title={title}
      value={value}
      fixedHeight
      loading={loading || recentsLoading}
    />
  );
};

export default StatsLastActiveBlock;
