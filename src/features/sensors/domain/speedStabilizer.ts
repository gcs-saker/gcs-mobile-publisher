export interface PositionReading {
  accuracy: number;
  latitude: number;
  longitude: number;
  measuredAtMs: number;
  reportedSpeedMps: number | null;
}

export interface SpeedStabilizer {
  reset(): void;
  update(reading: PositionReading): number | null;
  value(): number | null;
}

const EARTH_RADIUS_METERS = 6_371_000;
const MAX_ACCEPTED_ACCURACY_METERS = 30;
const MAX_REASONABLE_SPEED_MPS = 80;
const LOW_SPEED_MPS = 1.5;
const STATIONARY_CANDIDATE_MPS = 0.7;
const STATIONARY_FIX_COUNT = 3;
const STALE_AFTER_MS = 8_000;
const UNCERTAINTY_FACTOR = 0.5;

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceMeters(first: PositionReading, second: PositionReading): number {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function usableReportedSpeed(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0 || value > MAX_REASONABLE_SPEED_MPS) return null;
  return value;
}

export function createSpeedStabilizer(): SpeedStabilizer {
  let previous: PositionReading | null = null;
  let stableValue: number | null = null;
  let lastValidAtMs: number | null = null;
  let lastSeenAtMs: number | null = null;
  let stationaryFixes = 0;

  return {
    reset() {
      previous = null;
      stableValue = null;
      lastValidAtMs = null;
      lastSeenAtMs = null;
      stationaryFixes = 0;
    },
    update(reading) {
      if (lastSeenAtMs !== null && reading.measuredAtMs <= lastSeenAtMs) return stableValue;
      lastSeenAtMs = reading.measuredAtMs;

      if (!Number.isFinite(reading.accuracy) || reading.accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
        if (lastValidAtMs !== null && reading.measuredAtMs - lastValidAtMs > STALE_AFTER_MS) {
          previous = null;
          stableValue = null;
          stationaryFixes = 0;
        }
        return stableValue;
      }

      const reported = usableReportedSpeed(reading.reportedSpeedMps);
      let derived: number | null = null;
      let movementExceedsUncertainty = false;
      if (previous !== null) {
        const elapsedSeconds = (reading.measuredAtMs - previous.measuredAtMs) / 1_000;
        if (elapsedSeconds >= 0.5 && elapsedSeconds <= 10) {
          const distance = distanceMeters(previous, reading);
          const uncertainty = Math.hypot(previous.accuracy, reading.accuracy) * UNCERTAINTY_FACTOR;
          movementExceedsUncertainty = distance > Math.max(3, uncertainty);
          const calculated = distance / elapsedSeconds;
          derived = movementExceedsUncertainty && calculated <= MAX_REASONABLE_SPEED_MPS ? calculated : 0;
        }
      }
      previous = reading;
      lastValidAtMs = reading.measuredAtMs;

      let candidate = reported;
      if (reported === null) {
        candidate = derived;
      } else if (derived !== null) {
        const disagreement = Math.abs(reported - derived);
        candidate = disagreement > Math.max(3, derived * 1.5)
          ? derived
          : reported * 0.75 + derived * 0.25;
      }
      if (candidate !== null && candidate < LOW_SPEED_MPS && !movementExceedsUncertainty) candidate = 0;
      if (candidate === null) return stableValue;

      stationaryFixes = candidate <= STATIONARY_CANDIDATE_MPS ? stationaryFixes + 1 : 0;
      if (stableValue === null) {
        stableValue = candidate;
      } else {
        const alpha = candidate < stableValue ? 0.7 : 0.55;
        stableValue += (candidate - stableValue) * alpha;
      }
      if (stationaryFixes >= STATIONARY_FIX_COUNT || (stableValue < LOW_SPEED_MPS && !movementExceedsUncertainty)) {
        stableValue = 0;
      }
      return stableValue;
    },
    value() {
      return stableValue;
    },
  };
}
