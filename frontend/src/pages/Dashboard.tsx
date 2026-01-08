import { type FC } from "react";

import { useDateRange } from "../context/DateRangeContext";

import DateRangePicker from "../components/ui/DateRangePicker";
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

const Dashboard: FC = () => {
  const { selectedRange, startDate, endDate } = useDateRange();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <div className="row mb-4 text-center">
        <DateRangePicker />
      </div>

      <Separator />

      <PlayingStatus />

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-6">
          <StatsStreakBlock />
        </div>
        <div className="col-6">
          <StatsDatabaseEntriesBlock />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-3">
          <StatsPlaysBlock
            startDate={startISO}
            endDate={endISO}
            selectedRange={selectedRange}
          />
        </div>
        <div className="col-3">
          <StatsMinutesBlock startDate={startISO} endDate={endISO} />
        </div>
        <div className="col-3">
          <StatsArtistsBlock
            startDate={startISO}
            endDate={endISO}
            selectedRange={selectedRange}
          />
        </div>
        <div className="col-3">
          <StatsLastActiveBlock />
        </div>
      </div>

      {/* Diagram */}
      <div className="row mb-4 text-center">
        <div className="col">
          <ContentBlock title={"Minutes listened"}>
            <LineDiagram />
          </ContentBlock>
        </div>
      </div>

      {/* Top */}
      <div className="row mb-4 text-center align-items-stretch">
        <div className="col d-flex">
          <TopRankingBlock
            type="artists"
            limit={5}
            startDate={startISO}
            endDate={endISO}
          />
        </div>

        <div className="col d-flex">
          <TopRankingBlock
            type="tracks"
            limit={5}
            startDate={startISO}
            endDate={endISO}
          />
        </div>

        <div className="col d-flex">
          <TopRankingBlock
            type="albums"
            limit={5}
            startDate={startISO}
            endDate={endISO}
          />
        </div>
      </div>

      <Separator />

      {/* History */}
      <div className="row mb-4 text-center">
        <div className="col">
          <HistoryBlock />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
