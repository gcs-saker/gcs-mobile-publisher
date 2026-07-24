export const config = {
  streamApiBaseUrl: import.meta.env.VITE_STREAM_API_BASE_URL || "/media-control",
  telemetryUrl: import.meta.env.VITE_TELEMETRY_URL || "/api/telemetry/",
  defaultStreamId: import.meta.env.VITE_DEFAULT_STREAM_ID || "CID001",
};

export function loadAccessToken(): string {
  return sessionStorage.getItem("gcs.accessToken") || "";
}

export function saveAccessToken(token: string): void {
  if (token) sessionStorage.setItem("gcs.accessToken", token);
  else sessionStorage.removeItem("gcs.accessToken");
}
