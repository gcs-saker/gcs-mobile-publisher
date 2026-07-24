import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationApiError,
  HttpAuthenticationGateway,
} from "./HttpAuthenticationGateway";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const SESSION = {
  accessToken: "access",
  deviceId: "device-1",
  expiresAt: 10_000,
  refreshToken: "refresh",
};

describe("HttpAuthenticationGateway", () => {
  it("registers a device through the configured endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(SESSION));
    const gateway = new HttpAuthenticationGateway(
      { baseUrl: "https://control.example/" },
      fetcher,
    );

    await expect(
      gateway.registerDevice({ deviceName: "Pixel", registrationCode: "ABC-123" }),
    ).resolves.toEqual(SESSION);
    expect(fetcher).toHaveBeenCalledWith(
      "https://control.example/api/v1/auth/devices/register",
      expect.objectContaining({
        body: JSON.stringify({ deviceName: "Pixel", registrationCode: "ABC-123" }),
        method: "POST",
      }),
    );
  });

  it("does not accept malformed authentication payloads", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({ accessToken: "only" }));
    const gateway = new HttpAuthenticationGateway({ baseUrl: "" }, fetcher);

    await expect(gateway.refresh("refresh")).rejects.toThrow(TypeError);
  });

  it("exposes status without leaking response content", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response("sensitive server detail", { status: 401 }),
    );
    const gateway = new HttpAuthenticationGateway({ baseUrl: "" }, fetcher);

    const failure = gateway.login({ deviceId: "device-1", secret: "secret" });
    await expect(failure).rejects.toBeInstanceOf(AuthenticationApiError);
    await expect(failure).rejects.toMatchObject({ status: 401 });
    await expect(failure).rejects.not.toThrow("sensitive server detail");
  });

  it("revokes the access token without authorization headers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const gateway = new HttpAuthenticationGateway({ baseUrl: "" }, fetcher);

    await gateway.revoke("access");

    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/auth/revoke",
      expect.objectContaining({
        body: JSON.stringify({ accessToken: "access" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
  });
});
