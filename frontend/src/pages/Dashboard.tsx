import { type FC } from "react";
import { useNavigate } from "react-router-dom";

import { useDateRange } from "../context/DateRangeContext";

import DateRangePicker from "../components/blocks/DateRangePicker";
import Separator from "../components/blocks/Separator";
import ContentBlock from "../components/ui/ContentBlock";
import LineDiagram from "../components/blocks/MinutesDiagram";
import PlayingStatus from "../components/blocks/PlayingStatusRow";
import HistoryBlock from "../components/blocks/HistoryBlock";
import TopRankingBlock from "../components/blocks/TopRankingBlock";
import StatsLastActiveBlock from "../components/blocks/StatsLastActiveBlock";
import StatsDatabaseEntriesBlock from "../components/blocks/StatsDatabaseEntriesBlock";
import StatsStreakBlock from "../components/blocks/StatsStreakBlock";
import StatsArtistsBlock from "../components/blocks/StatsArtistsBlock";
import StatsMinutesBlock from "../components/blocks/StatsMinutesBlock";
import StatsPlaysBlock from "../components/blocks/StatsPlaysBlock";
import { usePlayerDetails } from "../hooks/usePlayerDetails";

const Dashboard: FC = () => {
  const navigate = useNavigate();

  const { selectedRange, startDate, endDate } = useDateRange();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const { playerActive } = usePlayerDetails();

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <div className="row mb-3 text-center">
        <DateRangePicker />
      </div>

      <Separator />

      {playerActive && <PlayingStatus />}

      {/* Stats */}
      <div className="row mb-3">
        <div className="col d-flex flex-wrap gap-3">
          <div className="stat-sm ">
            <StatsStreakBlock />
          </div>

          <div className="stat-sm">
            <StatsPlaysBlock
              startDate={startISO}
              endDate={endISO}
              selectedRange={selectedRange}
            />
          </div>

          <div className="stat-sm">
            <StatsMinutesBlock startDate={startISO} endDate={endISO} />
          </div>

          <div className="stat-sm">
            <StatsArtistsBlock
              startDate={startISO}
              endDate={endISO}
              selectedRange={selectedRange}
            />
          </div>
          <div className="stat-lg">
            <StatsDatabaseEntriesBlock />
          </div>

          <div className="stat-lg">
            <StatsLastActiveBlock />
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div className="row mb-3 text-center">
        <div className="col">
          <ContentBlock title={"Minutes listened"}>
            <LineDiagram />
          </ContentBlock>
        </div>
      </div>

      {/* Top */}
      <div className="row mb-3 text-center">
        <div className="col d-flex flex-wrap gap-3 align-items-stretch">
          <div
            className="flex-item d-flex"
            style={{ flex: "1 1 0", minWidth: "300px" }}
          >
            <TopRankingBlock
              type="artists"
              limit={5}
              startDate={startISO}
              endDate={endISO}
              buttonLabel="Show more"
              onButtonClick={() => navigate("/top/artists")}
            />
          </div>
          <div
            className="flex-item d-flex"
            style={{ flex: "1 1 0", minWidth: "300px" }}
          >
            <TopRankingBlock
              type="tracks"
              limit={5}
              startDate={startISO}
              endDate={endISO}
              buttonLabel="Show more"
              onButtonClick={() => navigate("/top/tracks")}
            />
          </div>
          <div
            className="flex-item d-flex"
            style={{ flex: "1 1 0", minWidth: "300px" }}
          >
            <TopRankingBlock
              type="albums"
              limit={5}
              startDate={startISO}
              endDate={endISO}
              buttonLabel="Show more"
              onButtonClick={() => navigate("/top/albums")}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* History */}
      <div className="row mb-3 text-center">
        <div className="col">
          <HistoryBlock />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
