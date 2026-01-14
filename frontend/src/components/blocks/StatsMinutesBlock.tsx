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

  if (error) {
    return (
      <StatBlock icon={<FaClock />} title="Minutes listened" value="Error" />
    );
  }

  return (
    <StatBlock
      icon={<FaClock />}
      title="Minutes listened"
      value={value.toString()}
      label={`(${minutesToHours(value)}h)`}
      loading={loading}
    />
  );
};

export default StatsMinutesBlock;
