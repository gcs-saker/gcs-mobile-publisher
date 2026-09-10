import type { SensorSnapshot } from "../../types";
import { OrientationLevel } from "../molecules/OrientationLevel";
import { TelemetryGrid } from "../molecules/TelemetryGrid";
import type { CoordinatePrecision } from "../../features/publisher/domain/publisherSettings";

export interface SensorDashboardProps {
  coordinatePrecision: CoordinatePrecision;
  snapshot: SensorSnapshot;
}

export function SensorDashboard({ coordinatePrecision, snapshot }: SensorDashboardProps) {
  return (
    <div className="sensor-dashboard">
      <OrientationLevel orientation={snapshot.orientation} />
      <TelemetryGrid coordinatePrecision={coordinatePrecision} location={snapshot.location} />
    </div>
  );
}
