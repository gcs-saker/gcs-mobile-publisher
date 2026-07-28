import type { SensorSnapshot } from "../../types";

export interface TelemetryGridProps {
  location: SensorSnapshot["location"];
}

export function TelemetryGrid({ location }: TelemetryGridProps) {
  return (
    <section className="telemetry" aria-label="GPS 원격 측정">
      <div><span>위도</span><strong>{location.latitude?.toFixed(6) ?? "대기"}</strong></div>
      <div><span>경도</span><strong>{location.longitude?.toFixed(6) ?? "대기"}</strong></div>
      <div><span>정확도</span><strong>{location.accuracy ? `±${location.accuracy.toFixed(0)}m` : "--"}</strong></div>
      <div><span>속도</span><strong>{location.speed !== null ? `${(location.speed * 3.6).toFixed(1)} km/h` : "--"}</strong></div>
    </section>
  );
}
