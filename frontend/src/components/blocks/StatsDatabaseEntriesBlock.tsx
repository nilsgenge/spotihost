import { FaDatabase } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import useDatabaseStats from "../../hooks/useDatabaseStats";

const StatsDatabaseEntriesBlock = () => {
  const { totalEntries, loading, error } = useDatabaseStats();

  if (error) {
    return (
      <StatBlock
        icon={<FaDatabase />}
        title="Database Size"
        value={error.valueOf()}
      />
    );
  }

  return (
    <StatBlock
      icon={<FaDatabase />}
      title="Database Size"
      value={totalEntries.toString() + " Entries"}
      loading={loading}
    />
  );
};

export default StatsDatabaseEntriesBlock;
