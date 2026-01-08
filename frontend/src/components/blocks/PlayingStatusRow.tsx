import StatBlock from "../ui/StatBlock";

import { usePlayerDetails } from "../../hooks/usePlayerDetails";
import { FaFile, FaGlobe, FaUsers } from "react-icons/fa";
import Seperator from "./Separator";

const PlayingStatus = () => {
  const {
    isLoading,
    error,
    isPlaying,
    shuffleState,
    repeatState,
    deviceType,
    songName,
    artistName,
    imageUrl,
    isExplicit,
    songUrl,
    contextType,
    contextUrl,
  } = usePlayerDetails();

  if (error)
    return (
      <>
        <div className="row mb-4">
          <div className="col">
            <StatBlock icon={<FaGlobe />} title=" " value="Error"></StatBlock>
          </div>
        </div>
        <Seperator />
      </>
    );

  if (isLoading)
    return (
      <>
        <div className="row mb-4">
          <div className="col">
            <StatBlock
              icon={<FaGlobe />}
              title=" "
              value="Loading..."
            ></StatBlock>
          </div>
        </div>
        <Seperator />
      </>
    );

  return (
    <>
      <div className="row mb-4">
        <div className="col-4">
          <StatBlock
            url={songUrl}
            imageUrl={imageUrl}
            title={
              songName === "Nothing Playing"
                ? "Nothing Playing"
                : isPlaying
                ? "Currently Playing"
                : "Currently Paused"
            }
            value={songName === "Nothing Playing" ? "-" : songName}
          />
        </div>
        <div className="col-4">
          <StatBlock icon={<FaUsers />} title="Artist" value={artistName} />
        </div>
        <div className="col-4">
          <StatBlock
            url={contextUrl}
            icon={<FaFile />}
            title="Source"
            value={
              contextType
                ? contextType.charAt(0).toUpperCase() + contextType.slice(1)
                : "-"
            }
          />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col">
          <StatBlock
            badgeText="Shuffle"
            value={shuffleState.valueOf() ? "On" : "Off"}
          />
        </div>
        <div className="col">
          <StatBlock badgeText="Repeat" value={repeatState.valueOf()} />
        </div>
        <div className="col">
          <StatBlock
            badgeText="Explicit"
            value={isExplicit.valueOf() ? "Yes" : "No"}
          />
        </div>
        <div className="col-4">
          <StatBlock badgeText="Device" value={deviceType.valueOf()} />
        </div>
      </div>

      <Seperator />
    </>
  );
};

export default PlayingStatus;
