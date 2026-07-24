import { config } from "./config";
import type { PublishAuthorization, TelemetryPayload } from "./types";

function authHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authorizePublish(
  streamId: string,
  token: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<PublishAuthorization> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(
    `${base}/api/v1/streams/${encodeURIComponent(streamId)}/publish`,
    {
      headers: { Accept: "application/json", ...authHeaders(token) },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) throw new Error(`송출 인증 실패 (${response.status})`);
  const data = (await response.json()) as Partial<PublishAuthorization>;
  if (!data.whipUrl) throw new Error("송출 서버가 WHIP URL을 반환하지 않았습니다.");
  return { whipUrl: data.whipUrl, iceServers: data.iceServers ?? [] };
}

export async function sendTelemetry(
  payload: TelemetryPayload,
  token: string,
  fetcher: typeof fetch,
): Promise<void> {
  const response = await fetcher(config.telemetryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error(`텔레메트리 전송 실패 (${response.status})`);
}
