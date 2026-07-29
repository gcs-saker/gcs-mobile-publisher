import type { PublisherStatus, SensorSnapshot } from "../../types";
import { BatteryStatus } from "../molecules/BatteryStatus";
import { StatusBadge } from "../atoms/StatusBadge";

export interface PublisherHeaderProps {
  battery: SensorSnapshot["battery"];
  principalName: string;
  isOnline: boolean;
  onLogout(): Promise<void>;
  status: PublisherStatus;
  streamId: string;
}

export function PublisherHeader({
  battery,
  principalName,
  isOnline,
  onLogout,
  status,
  streamId,
}: PublisherHeaderProps) {
  return (
    <header className="topbar">
      <StatusBadge status={status} />
      <div className="topbar__title">
        <strong>GCS FIELD</strong>
        <span>{streamId || "STREAM ID"}</span>
      </div>
      <div className="topbar__health">
        <span className={isOnline ? "network network--online" : "network network--offline"}>
          {isOnline ? "온라인" : "오프라인"}
        </span>
        <BatteryStatus battery={battery} />
        <button
          className="session-button"
          disabled={status === "live"}
          onClick={() => void onLogout()}
          title={principalName}
          type="button"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
