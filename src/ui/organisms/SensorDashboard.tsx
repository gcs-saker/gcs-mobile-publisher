import type { SensorSnapshot } from "../../types";
import { OrientationLevel } from "../molecules/OrientationLevel";
import { TelemetryGrid } from "../molecules/TelemetryGrid";

export interface SensorDashboardProps {
  snapshot: SensorSnapshot;
}

export function SensorDashboard({ snapshot }: SensorDashboardProps) {
  return (
    <div className="sensor-dashboard">
      <OrientationLevel orientation={snapshot.orientation} />
      <TelemetryGrid location={snapshot.location} />
    </div>
  );
}
