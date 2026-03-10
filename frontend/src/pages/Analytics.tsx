import React from "react";
import {
  CompletionRatePieDiagram,
  SkipRatePieDiagram,
  PlatformPieDiagram,
  ContextPieDiagram,
} from "../components/charts/PieDiagrams";
import ContentBlock from "../components/ui/ContentBlock";
import Separator from "../components/ui/Separator";
import { TotalPlaysLineDiagram } from "../components/charts/PlaysLineDiagrams";
import DateRangePicker from "../components/blocks/DateRangePicker";

const Analytics: React.FC = () => {
  return (
    <div className="container">
      {/* Header */}
      <div className="dashboard-header">
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

      <div className="row dashboard-section">
        <div className="col date-range-picker">
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
