import type { SensorSnapshot } from "../../types";
import type { CoordinatePrecision } from "../../features/publisher/domain/publisherSettings";
import { formatCoordinate } from "../../features/publisher/domain/publisherSettings";

export interface TelemetryGridProps {
  coordinatePrecision: CoordinatePrecision;
  location: SensorSnapshot["location"];
}

export function formatAltitude(altitude: number | null): string {
  return altitude === null ? "--" : `${altitude.toFixed(1)} m`;
}

export function TelemetryGrid({ coordinatePrecision, location }: TelemetryGridProps) {
  return (
    <section className="telemetry" aria-label="GPS 원격 측정">
      <div><span>위도</span><strong>{formatCoordinate(location.latitude, coordinatePrecision)}</strong></div>
      <div><span>경도</span><strong>{formatCoordinate(location.longitude, coordinatePrecision)}</strong></div>
      <div className="telemetry__wide"><span>고도</span><strong>{formatAltitude(location.altitude)}</strong></div>
      <div><span>정확도</span><strong>{location.accuracy ? `±${location.accuracy.toFixed(0)}m` : "--"}</strong></div>
      <div><span>속도</span><strong>{location.speed !== null ? `${(location.speed * 3.6).toFixed(1)} km/h` : "--"}</strong></div>
    </section>
  );
}
