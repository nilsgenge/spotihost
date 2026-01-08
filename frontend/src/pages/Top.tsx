import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDateRange } from "../context/DateRangeContext";
import DateRangePicker from "../components/blocks/DateRangePicker";
import Separator from "../components/blocks/Separator";
import TopRankingBlock from "../components/blocks/TopRankingBlock";

export type RankingType = "artists" | "tracks" | "albums";

const Top = () => {
  const { startDate, endDate } = useDateRange();
  const navigate = useNavigate();
  const location = useLocation();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const categories: Record<RankingType, { label: string }> = {
    artists: { label: "Artists" },
    tracks: { label: "Tracks" },
    albums: { label: "Albums" },
  };

  const getPathCategory = (): RankingType => {
    const path = location.pathname;
    if (path.endsWith("artists")) return "artists";
    if (path.endsWith("tracks")) return "tracks";
    if (path.endsWith("albums")) return "albums";
    return "artists";
  };

  const [selectedCategory, setSelectedCategory] =
    useState<RankingType>(getPathCategory);

  useEffect(() => {
    setSelectedCategory(getPathCategory());
  }, [location.pathname]);

  const handleCategoryChange = (category: RankingType) => {
    setSelectedCategory(category);
    navigate(`/top/${category}`);
  };

  return (
    <div className="container">
      <h1>Top</h1>
      <div className="row mb-4 text-center">
        <DateRangePicker />
      </div>

      <div className="row mb-3 text-center">
        <div className="col">
          <div className="d-flex gap-2 flex-wrap">
            {Object.entries(categories).map(([key, { label }]) => (
              <button
                key={key}
                className={`btn ${
                  selectedCategory === key
                    ? "btn-primary"
                    : "btn-outline-custom"
                }`}
                onClick={() => handleCategoryChange(key as RankingType)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      <div className="row mb-3 text-center">
        <div className="col">
          <TopRankingBlock
            key={selectedCategory}
            type={selectedCategory}
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
