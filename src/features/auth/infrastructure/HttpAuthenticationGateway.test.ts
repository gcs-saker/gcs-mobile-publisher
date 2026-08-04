import { describe, expect, it, vi } from "vitest";
import { HttpAuthenticationGateway } from "./HttpAuthenticationGateway";

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

describe("HttpAuthenticationGateway", () => {
  it("authenticates UUID and credential without accepting a client group", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({
      credentialVersion: 1, devicePolicyVersion: 2, deviceUuid: "device-1", groupId: "co-a",
    }));
    const gateway = new HttpAuthenticationGateway({ baseUrl: "/auth-policy" }, fetcher);
    await expect(gateway.authenticate({ credential: "secret", deviceUuid: "device-1" })).resolves.toEqual({
      credential: "secret", deviceUuid: "device-1",
    });
    expect(fetcher).toHaveBeenCalledWith("/auth-policy/policy/devices/authenticate", expect.objectContaining({
      body: JSON.stringify({ credential: "secret", deviceUuid: "device-1" }), method: "POST",
    }));
  });

  it("registers a front camera without sending a group or stream destination", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({
      credential: "secret", deviceType: "mobile", deviceUuid: "device-1", displayName: "Pixel",
      sensors: [], status: "pending", streamPaths: [],
    }, 201));
    const gateway = new HttpAuthenticationGateway({ baseUrl: "/auth-policy" }, fetcher);
    await gateway.register({ deviceName: "Pixel", provisioningToken: "token" });
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ deviceType: "mobile", displayName: "Pixel", provisioningToken: "token" });
    expect(body).not.toHaveProperty("groupId");
    expect(body).not.toHaveProperty("streamPaths");
  });
});
