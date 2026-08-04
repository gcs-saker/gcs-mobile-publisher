import { describe, expect, it, vi } from "vitest";
import { createPublishSession, endPublishSession, renewPublishSession } from "./api";

const identity = { credential: "device-secret", deviceUuid: "device-001" };

describe("device publish session API", () => {
  it("sends identity and sensor only, then accepts the server-owned stream", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({
      authorizationScheme: "Bearer",
      iceServers: [{ urls: "stun:stun.example:3478" }],
      protocol: "whip",
      publishToken: "short-token",
      publishTokenExpiresAt: "2026-08-04T01:03:00Z",
      publishUrl: "https://example.test/webrtc/raw/device-001/front/whip",
      renewalToken: "renew-token",
      renewalTokenExpiresAt: "2026-08-04T01:45:00Z",
      sessionId: "ps_001",
      streamId: "raw.device-001.front",
    }, { status: 201 }));

    await expect(createPublishSession(identity, fetcher)).resolves.toMatchObject({
      sessionId: "ps_001", streamId: "raw.device-001.front",
    });
    const request = fetcher.mock.calls[0];
    expect(request?.[0]).toBe("/media-control/api/v1/device/publish-sessions");
    expect(request?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ sensorId: "front" }),
      headers: expect.objectContaining({
        "X-GCS-Device-Credential": "device-secret",
        "X-GCS-Device-UUID": "device-001",
      }),
      method: "POST",
    }));
    expect(String(request?.[1]?.body)).not.toContain("group");
    expect(String(request?.[1]?.body)).not.toContain("streamId");
  });

  it("ends a session with the renewal token rather than device credentials", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    await endPublishSession({
      iceServers: [], publishToken: "short-token", publishTokenExpiresAt: "expiry",
      publishUrl: "publish", renewalToken: "renew-token", renewalTokenExpiresAt: "expiry",
      sessionId: "ps_001", streamId: "raw.device-001.front",
    }, fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      "/media-control/api/v1/device/publish-sessions/ps_001",
      expect.objectContaining({ headers: { Authorization: "Bearer renew-token" }, method: "DELETE" }),
    );
  });

  it("rotates both session tokens without changing the server-owned stream", async () => {
    const session = {
      iceServers: [], publishToken: "short-1", publishTokenExpiresAt: "expiry-1",
      publishUrl: "publish", renewalToken: "renew-1", renewalTokenExpiresAt: "expiry-1",
      sessionId: "ps_001", streamId: "raw.device-001.front",
    };
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({
      publishToken: "short-2", publishTokenExpiresAt: "expiry-2",
      renewalToken: "renew-2", renewalTokenExpiresAt: "expiry-2",
    }));
    await expect(renewPublishSession(session, fetcher)).resolves.toMatchObject({
      publishToken: "short-2", renewalToken: "renew-2", streamId: "raw.device-001.front",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/media-control/api/v1/device/publish-sessions/ps_001/renew",
      expect.objectContaining({ headers: { Authorization: "Bearer renew-1" }, method: "POST" }),
    );
  });
});
