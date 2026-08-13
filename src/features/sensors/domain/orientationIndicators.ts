export type CardinalDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface CompassIndicator {
  direction: CardinalDirection;
  heading: number;
}

export interface TiltAngles {
  beta: number | null;
  gamma: number | null;
}

export interface TiltBaseline {
  beta: number;
  gamma: number;
}

export interface TiltIndicator {
  horizontalPixels: number;
  pitchDegrees: number;
  pitchLabel: "상단 들림" | "상단 숙임" | "앞뒤 수평";
  rollDegrees: number;
  rollLabel: "우측 기울기" | "좌측 기울기" | "좌우 수평";
  verticalPixels: number;
}

const DIRECTIONS: readonly CardinalDirection[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function normalizeDegrees(value: number): number {
  return (value % 360 + 360) % 360;
}

function clamp(value: number): number {
  return Math.max(-36, Math.min(36, value));
}

export function cardinalDirection(heading: number): CardinalDirection {
  return DIRECTIONS[Math.floor((normalizeDegrees(heading) + 22.5) / 45) % DIRECTIONS.length] ?? "N";
}

export function compassIndicator(alpha: number | null, absolute: boolean): CompassIndicator | null {
  if (!absolute || alpha === null || !Number.isFinite(alpha)) return null;
  const heading = normalizeDegrees(360 - alpha);
  return { direction: cardinalDirection(heading), heading };
}

export function tiltIndicator(angles: TiltAngles, baseline: TiltBaseline): TiltIndicator {
  const pitchDegrees = (angles.beta ?? baseline.beta) - baseline.beta;
  const rollDegrees = (angles.gamma ?? baseline.gamma) - baseline.gamma;
  return {
    horizontalPixels: clamp(-rollDegrees),
    pitchDegrees,
    pitchLabel: pitchDegrees > 0.5 ? "상단 들림" : pitchDegrees < -0.5 ? "상단 숙임" : "앞뒤 수평",
    rollDegrees,
    rollLabel: rollDegrees > 0.5 ? "우측 기울기" : rollDegrees < -0.5 ? "좌측 기울기" : "좌우 수평",
    verticalPixels: clamp(-pitchDegrees),
  };
}
