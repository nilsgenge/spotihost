import { FaDatabase } from "react-icons/fa";
import StatBlock from "../ui/StatBlock";
import useDatabaseStats from "../../hooks/useDatabaseStats";

const StatsDatabaseEntriesBlock = () => {
  const {
    totalEntries: databaseTotalEntries,
    loading: isDatabaseEntriesLoading,
    error: databaseEntriesError,
  } = useDatabaseStats();

  return (
    <StatBlock
      icon={<FaDatabase />}
      title="Database Size"
      value={
        databaseEntriesError
          ? "Error"
          : isDatabaseEntriesLoading
          ? "Loading .."
          : databaseTotalEntries.toString() + " Entries"
      }
    />
  );
};

export default StatsDatabaseEntriesBlock;
