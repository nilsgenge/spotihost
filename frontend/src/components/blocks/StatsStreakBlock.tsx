import { type FC } from "react";
import { FaFire } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import { useListeningStreak } from "../../hooks/useListeningStreak";

const StatsStreakBlock: FC = () => {
  const { streak, loading, error } = useListeningStreak();

  if (loading) {
    return <StatBlock icon={<FaFire />} title="Loading.." value="" />;
  }

  if (error) {
    return <StatBlock icon={<FaFire />} title="Error" value="" />;
  }

  return (
    <StatBlock
      icon={<FaFire />}
      title="Listening Streak"
      value={streak.toString()}
    />
  );
};

export default StatsStreakBlock;
