import React from "react";
import pageStyles from "../styles/page.module.scss";
import {
  CompletionRatePieDiagram,
  SkipRatePieDiagram,
  PlatformPieDiagram,
  ContextPieDiagram,
} from "../components/charts/PieDiagrams";
import ContentBlock from "../components/ui/ContentBlock";
import Separator from "../components/ui/Separator";
import { TotalPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import { HeatmapDiagram } from "../components/charts/HeatmapDiagram";
import DateRangePicker from "../components/blocks/DateRangePicker";
import { AlbumReleaseYearLineDiagram } from "../components/charts/AlbumYearLineDiagram";
import { AvgSongLengthLineDiagram } from "../components/charts/AvgSongLengthLineDiagram";

const Analytics: React.FC = () => {
  return (
    <div className="container">
      {/* Header */}
      <div className={pageStyles.pageHeader}>
        <h1>Analytics</h1>
      </div>

      <Separator />

      {/* Information Section */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <ContentBlock title="Note on analytics:">
            <p className="mb-2">
              The following stats can only be calculated from history imports:
            </p>

            <ul className="ps-3 mb-3">
              <li>Skip Rate</li>
              <li>Completion Rate</li>
              <li>Listens per plattform</li>
            </ul>

            <p className="mb-2">
              The following stats can only be calculated from fetched listens:
            </p>

            <ul className="ps-3 mb-3">
              <li>Listens per context</li>
            </ul>

            <p>
              To ensure the most accurate results, it is recommend importing
              your Spotify history every few weeks. <br />
              Listens are automatically merged, giving you access to the new
              data.
            </p>
          </ContentBlock>
        </div>
      </div>

      <Separator />

      <div className={`row ${pageStyles.pageSection}`}>
        <div className="col">
          <DateRangePicker />
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Total Minutes */}
        <div className="col-12">
          <ContentBlock title="Number of Listens">
            <TotalPlaysLineDiagram />
          </ContentBlock>
        </div>

        <Separator />

        <div className="col-12">
          <ContentBlock title="Listening Activity" overflowVisible>
            <HeatmapDiagram />
          </ContentBlock>
        </div>

        <Separator />

        {/* Average Charts */}
        <div className="col-12 col-lg-6">
          <ContentBlock title="Average Album Release Date">
            <AlbumReleaseYearLineDiagram />
          </ContentBlock>
        </div>

        <div className="col-12 col-lg-6">
          <ContentBlock title="Average Song Length">
            <AvgSongLengthLineDiagram />
          </ContentBlock>
        </div>

        <Separator />

        {/* Pie Charts */}
        <div className="col-12 col-lg-6">
          <ContentBlock title="Skip Rate">
            <SkipRatePieDiagram height={500} donut={true} />
          </ContentBlock>
        </div>

        <div className="col-12 col-lg-6">
          <ContentBlock title="Completion Rate">
            <CompletionRatePieDiagram height={500} donut={true} />
          </ContentBlock>
        </div>

        <div className="col-12 col-lg-6">
          <ContentBlock title="Listens per Platform">
            <PlatformPieDiagram height={500} donut={true} />
          </ContentBlock>
        </div>

        <div className="col-12 col-lg-6">
          <ContentBlock title="Listens per Context">
            <ContextPieDiagram height={500} donut={true} />
          </ContentBlock>
        </div>
      </div>

      <Separator />
    </div>
  );
};

export default Analytics;
