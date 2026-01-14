import { type FC } from "react";
import { FaFire } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import { useListeningStreak } from "../../hooks/useListeningStreak";

const StatsStreakBlock: FC = () => {
  const { streak, loading, error } = useListeningStreak();

  if (error) {
    return (
      <StatBlock icon={<FaFire />} title="Listening Streak" value="Error" />
    );
  }

  return (
    <StatBlock
      icon={<FaFire />}
      title="Listening Streak"
      value={streak.toString()}
      loading={loading}
    />
  );
};

export default StatsStreakBlock;
