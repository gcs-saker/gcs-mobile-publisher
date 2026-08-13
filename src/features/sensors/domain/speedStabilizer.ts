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
const STATIONARY_THRESHOLD_MPS = 0.5;
const WINDOW_SIZE = 5;

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

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function usableReportedSpeed(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0 || value > MAX_REASONABLE_SPEED_MPS) return null;
  return value;
}

export function createSpeedStabilizer(): SpeedStabilizer {
  let previous: PositionReading | null = null;
  let samples: number[] = [];
  let stableValue: number | null = null;

  return {
    reset() {
      previous = null;
      samples = [];
      stableValue = null;
    },
    update(reading) {
      if (!Number.isFinite(reading.accuracy) || reading.accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
        return stableValue;
      }

      let candidate = usableReportedSpeed(reading.reportedSpeedMps);
      if (candidate === null && previous !== null) {
        const elapsedSeconds = (reading.measuredAtMs - previous.measuredAtMs) / 1_000;
        if (elapsedSeconds >= 0.5 && elapsedSeconds <= 10) {
          const derived = distanceMeters(previous, reading) / elapsedSeconds;
          candidate = derived <= MAX_REASONABLE_SPEED_MPS ? derived : null;
        }
      }
      previous = reading;
      if (candidate === null) return stableValue;

      const stationary = candidate < STATIONARY_THRESHOLD_MPS ? 0 : candidate;
      samples = [...samples, stationary].slice(-WINDOW_SIZE);
      stableValue = median(samples);
      return stableValue;
    },
    value() {
      return stableValue;
    },
  };
}
