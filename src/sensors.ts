import type { SensorSnapshot, TelemetryPayload } from "./types";
import type { Clock } from "./app/ports";

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
  clock: Clock,
  userAgent: string,
): TelemetryPayload {
  return {
    ...snapshot,
    uuid: streamId,
    epochTime: Math.max(0, Math.floor((clock.now() - startedAt) / 1000)),
    userAgent,
  };
}
