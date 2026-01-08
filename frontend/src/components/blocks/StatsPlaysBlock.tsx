import { type FC } from "react";
import { FaPlay } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import { usePlaysCount } from "../../hooks/usePlaysCount";

interface StatsPlaysBlockProps {
  startDate: string;
  endDate: string;
  selectedRange: string;
}

const StatsPlaysBlock: FC<StatsPlaysBlockProps> = ({
  startDate,
  endDate,
  selectedRange,
}) => {
  const { listensCount, previousPlaysCount, loading, error } = usePlaysCount(
    startDate,
    endDate,
    selectedRange
  );

  if (loading) {
    return <StatBlock icon={<FaPlay />} title="Loading.." value="" />;
  }

  if (error) {
    return <StatBlock icon={<FaPlay />} title="Error" value="" />;
  }

  const change = listensCount - previousPlaysCount;

  return (
    <StatBlock
      icon={<FaPlay />}
      title="Plays"
      value={listensCount.toString()}
      change={change !== 0 ? change : undefined}
    />
  );
};

export default StatsPlaysBlock;
