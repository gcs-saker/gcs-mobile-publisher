import { describe, expect, it, vi } from "vitest";
import { HttpAuthenticationGateway } from "./HttpAuthenticationGateway";

describe("HttpAuthenticationGateway", () => {
  it("uses the existing account login endpoint with cookies and csrf protection", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({
      access_token: "access-token", expires_in_minutes: 15, role: "operator", token_type: "bearer", username: "operator-a",
    }));
    const gateway = new HttpAuthenticationGateway({ baseUrl: "/auth-policy" }, fetcher);

    await expect(gateway.login({ username: "operator-a", password: "secret" })).resolves.toMatchObject({
      accessToken: "access-token", role: "operator", username: "operator-a",
    });
    expect(fetcher).toHaveBeenCalledWith("/auth-policy/auth/login", expect.objectContaining({
      body: JSON.stringify({ username: "operator-a", password: "secret" }), credentials: "include", method: "POST",
      headers: expect.objectContaining({ "X-GCS-CSRF": "same-origin" }),
    }));
  });
});
