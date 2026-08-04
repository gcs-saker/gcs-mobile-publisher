export const config = {
  deviceApiBaseUrl: import.meta.env["VITE_DEVICE_API_BASE_URL"] || "/auth-policy",
  streamApiBaseUrl: import.meta.env["VITE_STREAM_API_BASE_URL"] || "/media-control",
  telemetryApiBaseUrl: import.meta.env["VITE_TELEMETRY_API_BASE_URL"] || "/api/v1/devices",
};
