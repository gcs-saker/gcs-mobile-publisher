export const config = {
  streamApiBaseUrl: import.meta.env.VITE_STREAM_API_BASE_URL || "/media-control",
  telemetryUrl: import.meta.env.VITE_TELEMETRY_URL || "/api/telemetry/",
  defaultStreamId: import.meta.env.VITE_DEFAULT_STREAM_ID || "CID001",
};
