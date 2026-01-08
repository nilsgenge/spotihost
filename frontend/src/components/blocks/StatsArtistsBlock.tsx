import { type FC } from "react";
import { FaUsers } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import { useListenedArtists } from "../../hooks/useListenedArtists";

interface StatsArtistsBlockProps {
  startDate: string;
  endDate: string;
  selectedRange: string;
}

const StatsArtistsBlock: FC<StatsArtistsBlockProps> = ({
  startDate,
  endDate,
  selectedRange,
}) => {
  const { artistCount, previousArtistCount, loading, error } =
    useListenedArtists(startDate, endDate, selectedRange);

  if (loading) {
    return <StatBlock icon={<FaUsers />} title="Loading.." value="" />;
  }

  if (error) {
    return <StatBlock icon={<FaUsers />} title="Error" value="" />;
  }

  const change = artistCount - previousArtistCount;

  return (
    <StatBlock
      icon={<FaUsers />}
      title="Artists listened"
      value={artistCount.toString()}
      change={change !== 0 ? change : undefined}
    />
  );
};

export default StatsArtistsBlock;
