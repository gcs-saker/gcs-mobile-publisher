import type { SensorSnapshot } from "../../types";

export interface OrientationLevelProps {
  orientation: SensorSnapshot["orientation"];
}

function clampTilt(value: number | null): number {
  return Math.max(-36, Math.min(36, value ?? 0));
}

export function OrientationLevel({ orientation }: OrientationLevelProps) {
  return (
    <section className="level" aria-label="기기 기울기">
      <div className="level__crosshair" aria-hidden="true">
        <span
          className="level__dot"
          style={{
            transform: `translate(${clampTilt(orientation.gamma)}px, ${clampTilt(orientation.beta)}px)`,
          }}
        />
      </div>
      <span>좌우 {orientation.gamma?.toFixed(1) ?? "--"}°</span>
      <span>앞뒤 {orientation.beta?.toFixed(1) ?? "--"}°</span>
    </section>
  );
}
