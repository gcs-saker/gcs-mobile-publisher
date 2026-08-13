import { useState } from "react";
import {
  compassIndicator,
  tiltIndicator,
  type TiltBaseline,
} from "../../features/sensors/domain/orientationIndicators";
import type { SensorSnapshot } from "../../types";

export interface OrientationLevelProps {
  orientation: SensorSnapshot["orientation"];
}

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function OrientationLevel({ orientation }: OrientationLevelProps) {
  const [baseline, setBaseline] = useState<TiltBaseline>({ beta: 0, gamma: 0 });
  const compass = compassIndicator(orientation.alpha, orientation.absolute);
  const tilt = tiltIndicator(orientation, baseline);

  function calibrate(): void {
    setBaseline({ beta: orientation.beta ?? 0, gamma: orientation.gamma ?? 0 });
  }

  return (
    <section className="level" aria-label="기기 기울기와 방위">
      <div className="level__crosshair" aria-hidden="true">
        {DIRECTIONS.map((direction) => (
          <span className={`level__direction level__direction--${direction.toLowerCase()}`} key={direction}>
            {direction}
          </span>
        ))}
        <span className="level__dot" style={{
          transform: `translate(${tilt.horizontalPixels}px, ${tilt.verticalPixels}px)`,
        }} />
      </div>
      <div className="level__readings">
        <strong>{compass ? `${compass.heading.toFixed(0)}° ${compass.direction}` : "방위 보정 필요"}</strong>
        <span>{tilt.pitchLabel} {Math.abs(tilt.pitchDegrees).toFixed(1)}°</span>
        <span>{tilt.rollLabel} {Math.abs(tilt.rollDegrees).toFixed(1)}°</span>
        <button className="level__calibrate" onClick={calibrate} type="button">현재 자세를 수평으로</button>
      </div>
    </section>
  );
}
