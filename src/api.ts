import { config } from "./config";
import type { DeviceCredential } from "./features/auth/contracts/authentication";
import type { PublishSession, TelemetryPayload } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): RTCIceServer[] => {
    if (!isRecord(candidate)) return [];
    const { credential, urls, username } = candidate;
    if (typeof urls !== "string" && !Array.isArray(urls)) return [];
    if (Array.isArray(urls) && !urls.every((url) => typeof url === "string")) return [];
    return [{
      urls: urls as string | string[],
      ...(typeof credential === "string" ? { credential } : {}),
      ...(typeof username === "string" ? { username } : {}),
    }];
  });
}

function decodePublishSession(value: unknown): PublishSession {
  if (!isRecord(value)) throw new TypeError("Invalid publish session response");
  const { iceServers, publishToken, publishTokenExpiresAt, publishUrl, renewalToken,
    renewalTokenExpiresAt, sessionId, streamId } = value;
  if (
    typeof publishToken !== "string" || typeof publishTokenExpiresAt !== "string"
    || typeof publishUrl !== "string" || typeof renewalToken !== "string"
    || typeof renewalTokenExpiresAt !== "string" || typeof sessionId !== "string"
    || typeof streamId !== "string"
  ) throw new TypeError("Invalid publish session response");
  return {
    iceServers: decodeIceServers(iceServers), publishToken, publishTokenExpiresAt,
    publishUrl, renewalToken, renewalTokenExpiresAt, sessionId, streamId,
  };
}

function deviceHeaders(identity: DeviceCredential): Record<string, string> {
  return {
    "X-GCS-Device-Credential": identity.credential,
    "X-GCS-Device-UUID": identity.deviceUuid,
  };
}

export async function createPublishSession(
  identity: DeviceCredential,
  fetcher: typeof fetch,
  sensorId = "front",
): Promise<PublishSession> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/device/publish-sessions`, {
    body: JSON.stringify({ sensorId }),
    headers: { Accept: "application/json", "Content-Type": "application/json", ...deviceHeaders(identity) },
    method: "POST",
  });
  if (!response.ok) throw new Error(`송출 세션 생성 실패 (${response.status})`);
  return decodePublishSession(await response.json());
}

export async function endPublishSession(session: PublishSession, fetcher: typeof fetch): Promise<void> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/device/publish-sessions/${encodeURIComponent(session.sessionId)}`, {
    headers: { Authorization: `Bearer ${session.renewalToken}` },
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) throw new Error(`송출 세션 종료 실패 (${response.status})`);
}

export async function renewPublishSession(
  session: PublishSession,
  fetcher: typeof fetch,
): Promise<PublishSession> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(
    `${base}/api/v1/device/publish-sessions/${encodeURIComponent(session.sessionId)}/renew`,
    { headers: { Authorization: `Bearer ${session.renewalToken}` }, method: "POST" },
  );
  if (!response.ok) throw new Error(`송출 세션 갱신 실패 (${response.status})`);
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new TypeError("Invalid publish session renewal response");
  const { publishToken, publishTokenExpiresAt, renewalToken, renewalTokenExpiresAt } = payload;
  if (
    typeof publishToken !== "string" || typeof publishTokenExpiresAt !== "string"
    || typeof renewalToken !== "string" || typeof renewalTokenExpiresAt !== "string"
  ) throw new TypeError("Invalid publish session renewal response");
  return { ...session, publishToken, publishTokenExpiresAt, renewalToken, renewalTokenExpiresAt };
}

export async function sendTelemetry(
  payload: TelemetryPayload,
  identity: DeviceCredential,
  fetcher: typeof fetch,
): Promise<void> {
  const base = config.telemetryApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/${encodeURIComponent(identity.deviceUuid)}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...deviceHeaders(identity) },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error(`텔레메트리 전송 실패 (${response.status})`);
}
