export const config = {
  authApiBaseUrl: import.meta.env["VITE_AUTH_API_BASE_URL"] || "/auth-policy/auth",
  streamApiBaseUrl: import.meta.env["VITE_STREAM_API_BASE_URL"] || "/media-control",
  telemetryUrl: import.meta.env["VITE_TELEMETRY_URL"] || "/api/telemetry/",
  defaultStreamId: import.meta.env["VITE_DEFAULT_STREAM_ID"] || "raw.mobile.front",
};
