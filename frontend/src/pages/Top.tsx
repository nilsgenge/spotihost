import { useLocation } from "react-router-dom";
import pageStyles from "../styles/page.module.scss";
import styles from "./Top.module.scss";
import { Link } from "react-router-dom";
import { useDateRange } from "../context/DateRangeContext";
import DateRangePicker from "../components/blocks/DateRangePicker";
import Separator from "../components/ui/Separator";
import TopRankingBlock from "../components/blocks/TopRankingBlock";

export type RankingType = "artists" | "tracks" | "albums";

const CATEGORIES: Record<RankingType, { label: string; path: string }> = {
  artists: { label: "Artists", path: "/top/artists" },
  tracks: { label: "Tracks", path: "/top/tracks" },
  albums: { label: "Albums", path: "/top/albums" },
};

const Top = () => {
  const { startDate, endDate } = useDateRange();
  const location = useLocation();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const getActiveCategory = (): RankingType => {
    const path = location.pathname;
    if (path.endsWith("artists")) return "artists";
    if (path.endsWith("tracks")) return "tracks";
    if (path.endsWith("albums")) return "albums";
    return "artists";
  };

  const activeCategory = getActiveCategory();

  return (
    <div className="container">
      {/* Header */}
      <div className={pageStyles.pageHeader}>
        <h1>Top</h1>
      </div>

      <div className={`row ${pageStyles.pageSection}`}>
        <div className="col">
          <DateRangePicker />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`row ${pageStyles.pageSection}`}>
        <div className="col">
          <div className={`d-flex gap-2 flex-wrap ${styles.categoryTabs}`}>
            {Object.entries(CATEGORIES).map(([key, { label, path }]) => {
              const isActive = activeCategory === key;
              return (
                <Link
                  key={key}
                  to={path}
                  className={`btn ${
                    isActive ? "btn-primary" : "btn-outline-custom"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <Separator />

      <div className="row justify-content-center g-4">
        <div className="col">
          <TopRankingBlock
            key={activeCategory}
            type={activeCategory}
            limit={30}
            startDate={startISO}
            endDate={endISO}
          />
        </div>
      </div>
    </div>
  );
};

export default Top;
