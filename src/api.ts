import { config } from "./config";
import type { AuthenticatedAccount } from "./features/auth/contracts/authentication";
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

function accountHeaders(identity: AuthenticatedAccount): Record<string, string> {
  return { Authorization: `Bearer ${identity.accessToken}` };
}

interface AccountTelemetryRequest {
  altitude: number | null;
  batteryPercent: number | null;
  epochTime: number;
  headingDeg: number | null;
  latitude: number | null;
  longitude: number | null;
  pitchDeg: number | null;
  rollDeg: number | null;
  uuid: string;
  velocity: number | null;
  yawDeg: number | null;
}

function accountTelemetryRequest(payload: TelemetryPayload): AccountTelemetryRequest {
  return {
    altitude: payload.location.altitude,
    batteryPercent: payload.battery.level === null ? null : payload.battery.level * 100,
    epochTime: payload.epochTime,
    headingDeg: payload.location.heading,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    pitchDeg: payload.orientation.beta,
    rollDeg: payload.orientation.gamma,
    uuid: payload.uuid,
    velocity: payload.location.speed,
    yawDeg: payload.orientation.alpha,
  };
}

export async function createPublishSession(
  identity: AuthenticatedAccount,
  fetcher: typeof fetch,
  sensorId = "front",
): Promise<PublishSession> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/account/publish-sessions`, {
    body: JSON.stringify({ sensorId }),
    headers: { Accept: "application/json", "Content-Type": "application/json", ...accountHeaders(identity) },
    method: "POST",
  });
  if (!response.ok) throw new Error(`송출 세션 생성 실패 (${response.status})`);
  return decodePublishSession(await response.json());
}

export async function endPublishSession(session: PublishSession, fetcher: typeof fetch): Promise<void> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/account/publish-sessions/${encodeURIComponent(session.sessionId)}`, {
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
    `${base}/api/v1/account/publish-sessions/${encodeURIComponent(session.sessionId)}/renew`,
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
  identity: AuthenticatedAccount,
  fetcher: typeof fetch,
): Promise<void> {
  const base = config.telemetryApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/telemetry/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...accountHeaders(identity) },
    body: JSON.stringify(accountTelemetryRequest(payload)),
    keepalive: true,
  });
  if (!response.ok) throw new Error(`텔레메트리 전송 실패 (${response.status})`);
}

export interface CameraControlCommand {
  facingMode: "environment" | "user" | "";
  revision: number;
}

export async function fetchCameraControlCommand(
  identity: AuthenticatedAccount,
  streamId: string,
  fetcher: typeof fetch,
): Promise<CameraControlCommand> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/streams/${encodeURIComponent(streamId)}/camera-control`, {
    headers: { Accept: "application/json", ...accountHeaders(identity) },
  });
  if (!response.ok) throw new Error(`카메라 전환 상태 확인 실패 (${response.status})`);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload["revision"] !== "number") {
    throw new TypeError("Invalid camera control response");
  }
  const facingMode = payload["facingMode"] === "front" ? "user"
    : payload["facingMode"] === "rear" ? "environment" : "";
  return { facingMode, revision: payload["revision"] };
}

export async function fetchTalkbackPlaybackUrl(
  identity: AuthenticatedAccount,
  streamId: string,
  fetcher: typeof fetch,
): Promise<string> {
  const base = config.streamApiBaseUrl.replace(/\/$/, "");
  const response = await fetcher(`${base}/api/v1/streams/${encodeURIComponent(streamId)}/talkback-playback`, {
    headers: { Accept: "application/json", ...accountHeaders(identity) },
  });
  if (!response.ok) throw new Error(`관제 음성 세션 생성 실패 (${response.status})`);
  const payload: unknown = await response.json();
  const playbackUrls = isRecord(payload) ? payload["playbackUrls"] : null;
  if (!isRecord(playbackUrls) || typeof playbackUrls["webrtc"] !== "string") {
    throw new TypeError("Invalid talkback playback response");
  }
  return playbackUrls["webrtc"];
}
