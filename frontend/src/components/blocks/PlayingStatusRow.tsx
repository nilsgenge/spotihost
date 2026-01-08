import StatBlock from "../ui/StatBlock";

import { usePlayerDetails } from "../../hooks/usePlayerDetails";
import { FaFile, FaGlobe, FaUsers } from "react-icons/fa";
import Seperator from "./Separator";
import Status from "../ui/Status";

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
        <div className="col d-flex gap-2 flex-wrap">
          <Status
            text="Shuffle"
            status={shuffleState.valueOf() ? "activated" : "deactivated"}
          />
          <Status
            text="Repeat"
            status={repeatState == "off" ? "deactivated" : "activated"}
          />
          <Status text={deviceType.valueOf()} status="neutral" />
          {isExplicit && <Status text="Explicit" status="neutral" />}
        </div>
      </div>

      <Seperator />
    </>
  );
};

export default PlayingStatus;
