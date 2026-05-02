import StatBlock from "../ui/StatBlock";
import ElementBlock from "../ui/ElementBlock";

import { usePlayerDetails } from "../../hooks/usePlayerDetails";
import { FaFile, FaUsers } from "react-icons/fa";
import Seperator from "../ui/Separator";
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
            <StatBlock title=" " value={error.valueOf()}></StatBlock>
          </div>
        </div>
        <Seperator />
      </>
    );

  if (isLoading) return;

  const nothingPlaying = songName === "Nothing Playing";

  return (
    <>
      <div className="row mb-4 d-none d-md-flex">
        <div className="col-12 col-md-4">
          <StatBlock
            url={songUrl}
            imageUrl={imageUrl}
            title={
              nothingPlaying
                ? "Nothing Playing"
                : isPlaying
                  ? "Currently Playing"
                  : "Currently Paused"
            }
            value={nothingPlaying ? "-" : songName}
          />
        </div>
        <div className="col-12 col-md-4">
          <StatBlock icon={<FaUsers />} title="Artist" value={artistName} />
        </div>
        <div className="col-12 col-md-4">
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

      {!nothingPlaying && (
        <div className="d-md-none mb-4">
          <ElementBlock
            image={imageUrl}
            title={songName}
            title_url={songUrl}
            label={[{ name: artistName }]}
          />
        </div>
      )}

      <div className="row mb-4 d-none d-md-flex">
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

      {!nothingPlaying && (
        <div className="row mb-4 d-md-none">
          <div className="col d-flex gap-2 flex-wrap">
            <Status
              text={isPlaying ? "Now Playing" : "Paused"}
              status={isPlaying ? "activated" : "deactivated"}
            />
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
      )}

      <Seperator />
    </>
  );
};

export default PlayingStatus;
