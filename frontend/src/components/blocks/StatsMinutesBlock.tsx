import { type FC } from "react";
import { FaClock } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import { useMinutesListened } from "../../hooks/useMinutesListened";
import { minutesToHours } from "../../utils/utils";

interface StatsMinutesBlockProps {
  startDate: string;
  endDate: string;
}

const StatsMinutesBlock: FC<StatsMinutesBlockProps> = ({
  startDate,
  endDate,
}) => {
  const { value, loading, error } = useMinutesListened(startDate, endDate);

  if (loading) {
    return <StatBlock icon={<FaClock />} title="Loading.." value="" />;
  }

  if (error) {
    return <StatBlock icon={<FaClock />} title="Error" value="" />;
  }

  return (
    <StatBlock
      icon={<FaClock />}
      title="Minutes listened"
      value={value.toString()}
      label={`(${minutesToHours(value)}h)`}
    />
  );
};

export default StatsMinutesBlock;
