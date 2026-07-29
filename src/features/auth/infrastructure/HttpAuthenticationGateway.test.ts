import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationApiError,
  HttpAuthenticationGateway,
} from "./HttpAuthenticationGateway";

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

const TOKEN_RESPONSE = {
  access_token: "access",
  expires_in_minutes: 30,
  role: "viewer",
  token_type: "bearer",
  username: "test1",
};

const API_CONFIGURATION = {
  baseUrl: "/auth-policy/auth",
  now: () => 1_000,
};

describe("HttpAuthenticationGateway", () => {
  it("signs up through the deployed auth-policy contract", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({
      company_id: 1,
      email: "test1@example.com",
      id: 7,
      role: "viewer",
      username: "test1",
    }, 201));
    const gateway = new HttpAuthenticationGateway(
      API_CONFIGURATION,
      fetcher,
    );
    const request = {
      email: "test1@example.com",
      inviteCode: "invite",
      password: "strong-password",
      role: "viewer" as const,
      username: "test1",
    };

    await expect(gateway.signup(request)).resolves.toMatchObject({
      companyId: 1,
      username: "test1",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/auth-policy/auth/signup",
      expect.objectContaining({
        body: JSON.stringify(request),
        credentials: "include",
        headers: expect.objectContaining({ "X-GCS-CSRF": "same-origin" }),
        method: "POST",
      }),
    );
  });

  it("logs in and decodes the snake case token response", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(TOKEN_RESPONSE));
    const gateway = new HttpAuthenticationGateway(
      API_CONFIGURATION,
      fetcher,
    );

    await expect(gateway.login({
      password: "strong-password",
      username: "test1",
    })).resolves.toMatchObject({
      accessToken: "access",
      role: "viewer",
      username: "test1",
    });
  });

  it("refreshes through the HttpOnly cookie without a token body", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(TOKEN_RESPONSE));
    const gateway = new HttpAuthenticationGateway(
      API_CONFIGURATION,
      fetcher,
    );

    await gateway.refresh();

    expect(fetcher).toHaveBeenCalledWith(
      "/auth-policy/auth/refresh",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "X-GCS-CSRF": "same-origin" }),
        method: "POST",
      }),
    );
    const requestInit = fetcher.mock.calls[0]?.[1];
    expect(requestInit).not.toHaveProperty("body");
  });

  it("parses the server detail without exposing unrelated response content", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => response({ detail: "Invalid credentials" }, 401),
    );
    const gateway = new HttpAuthenticationGateway(
      API_CONFIGURATION,
      fetcher,
    );

    const failure = gateway.login({ password: "wrong-password", username: "test1" });
    await expect(failure).rejects.toBeInstanceOf(AuthenticationApiError);
    await expect(failure).rejects.toMatchObject({
      message: "Invalid credentials",
      status: 401,
    });
  });

  it("logs out with the bearer token and same-origin protection", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const gateway = new HttpAuthenticationGateway(
      API_CONFIGURATION,
      fetcher,
    );

    await gateway.logout("access");

    expect(fetcher).toHaveBeenCalledWith(
      "/auth-policy/auth/logout",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer access",
          "X-GCS-CSRF": "same-origin",
        }),
        method: "POST",
      }),
    );
  });
});
