export type PublisherStatus =
  | "idle"
  | "requesting"
  | "preview"
  | "authorizing"
  | "connecting"
  | "live"
  | "reconnecting"
  | "error";

export interface SensorSnapshot {
  capturedAt: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
  };
  orientation: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
  };
  battery: {
    supported: boolean;
    level: number | null;
    charging: boolean | null;
  };
}

export interface TelemetryPayload extends SensorSnapshot {
  uuid: string;
  epochTime: number;
  userAgent: string;
}

export interface PublishAuthorization {
  whipUrl: string;
  iceServers: RTCIceServer[];
}
