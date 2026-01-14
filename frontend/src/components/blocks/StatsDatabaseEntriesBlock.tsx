import { FaDatabase } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import useDatabaseStats from "../../hooks/useDatabaseStats";

const StatsDatabaseEntriesBlock = () => {
  const {
    totalEntries: databaseTotalEntries,
    loading: isDatabaseEntriesLoading,
    error: databaseEntriesError,
  } = useDatabaseStats();

  if (databaseEntriesError) {
    return (
      <StatBlock icon={<FaDatabase />} title="Database Size" value="Error" />
    );
  }

  return (
    <StatBlock
      icon={<FaDatabase />}
      title="Database Size"
      value={databaseTotalEntries.toString() + " Entries"}
      loading={isDatabaseEntriesLoading}
    />
  );
};

export default StatsDatabaseEntriesBlock;
