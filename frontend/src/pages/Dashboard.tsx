import { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useDateRange } from "../context/DateRangeContext";

import DateRangePicker from "../components/blocks/DateRangePicker";
import Separator from "../components/ui/Separator";
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
import ContentBlock from "../components/ui/ContentBlock";
import { TotalMinutesLineDiagram } from "../components/charts/MinutesLineDiagrams";

const Dashboard: FC = () => {
  const navigate = useNavigate();
  const { selectedRange, startDate, endDate } = useDateRange();
  const { playerActive } = usePlayerDetails();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="row page-section">
        <div className="col date-range-picker">
          <DateRangePicker />
        </div>
      </div>

      <Separator />

      {/* Playing Status */}
      {playerActive && (
        <div className="mb-4">
          <PlayingStatus />
        </div>
      )}

      {/* Stats Grid */}
      <div className="row g-4 mb-4">
        <div className="col-6 col-lg-3">
          <StatsStreakBlock />
        </div>
        <div className="col-6 col-lg-3">
          <StatsPlaysBlock
            startDate={startISO}
            endDate={endISO}
            selectedRange={selectedRange}
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatsMinutesBlock startDate={startISO} endDate={endISO} />
        </div>
        <div className="col-6 col-lg-3">
          <StatsArtistsBlock
            startDate={startISO}
            endDate={endISO}
            selectedRange={selectedRange}
          />
        </div>

        <div className="col-12 col-md-6">
          <StatsDatabaseEntriesBlock />
        </div>
        <div className="col-12 col-md-6">
          <StatsLastActiveBlock />
        </div>
      </div>

      {/* Minutes Chart */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <ContentBlock title="Total Minutes Listened">
            <TotalMinutesLineDiagram />
          </ContentBlock>
        </div>
      </div>

      {/* Top Rankings */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-4 h-100">
          <TopRankingBlock
            className="h-100 d-flex flex-column"
            type="artists"
            limit={5}
            startDate={startISO}
            endDate={endISO}
            buttonLabel="Show more"
            onButtonClick={() => navigate("/top/artists")}
          />
        </div>

        <div className="col-12 col-md-6 col-lg-4 h-100">
          <TopRankingBlock
            className="h-100 d-flex flex-column"
            type="tracks"
            limit={5}
            startDate={startISO}
            endDate={endISO}
            buttonLabel="Show more"
            onButtonClick={() => navigate("/top/tracks")}
          />
        </div>

        <div className="col-12 col-md-6 col-lg-4 h-100">
          <TopRankingBlock
            className="h-100 d-flex flex-column"
            type="albums"
            limit={5}
            startDate={startISO}
            endDate={endISO}
            buttonLabel="Show more"
            onButtonClick={() => navigate("/top/albums")}
          />
        </div>
      </div>

      <Separator />

      {/* History */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <HistoryBlock />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
