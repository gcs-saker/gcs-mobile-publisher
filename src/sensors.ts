import type { SensorSnapshot, TelemetryPayload } from "./types";
import type { Clock } from "./app/ports";
import type { CoordinatePrecision } from "./features/publisher/domain/publisherSettings";

export const emptySnapshot: SensorSnapshot = {
  capturedAt: new Date(0).toISOString(),
  location: {
    latitude: null, longitude: null, altitude: null,
    accuracy: null, speed: null, heading: null,
  },
  orientation: { alpha: null, beta: null, gamma: null, absolute: false },
  battery: { supported: false, level: null, charging: null },
};

export function buildTelemetryPayload(
  streamId: string,
  startedAt: number,
  snapshot: SensorSnapshot,
  coordinatePrecision: CoordinatePrecision,
  clock: Clock,
  userAgent: string,
): TelemetryPayload {
  return {
    ...snapshot,
    location: {
      ...snapshot.location,
      latitude: roundCoordinate(snapshot.location.latitude, coordinatePrecision),
      longitude: roundCoordinate(snapshot.location.longitude, coordinatePrecision),
    },
    uuid: streamId,
    epochTime: Math.max(0, Math.floor((clock.now() - startedAt) / 1000)),
    userAgent,
  };
}

function roundCoordinate(value: number | null, precision: CoordinatePrecision): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}
