import { describe, expect, it, vi } from "vitest";
import type { Clock } from "../../../app/ports";
import type {
  AuthSession,
  AuthSessionRepository,
  AuthenticationGateway,
} from "../contracts/authentication";
import {
  AuthenticationRequiredError,
  AuthSessionManager,
} from "./AuthSessionManager";

const NOW = 1_000;

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "access-token",
    expiresAt: NOW + 60_000,
    role: "viewer",
    username: "test1",
    ...overrides,
  };
}

function dependencies(initial: AuthSession | null = null) {
  let stored = initial;
  const gateway: AuthenticationGateway = {
    login: vi.fn(async () => session()),
    logout: vi.fn(async () => undefined),
    refresh: vi.fn(async () => session({ accessToken: "refreshed-token" })),
    signup: vi.fn(async () => ({
      companyId: 1,
      email: "test1@example.com",
      id: 7,
      role: "viewer" as const,
      username: "test1",
    })),
  };
  const repository: AuthSessionRepository = {
    clear: vi.fn(async () => {
      stored = null;
    }),
    load: vi.fn(async () => stored),
    save: vi.fn(async (value) => {
      stored = value;
    }),
  };
  const clock: Clock = {
    isoNow: () => new Date(NOW).toISOString(),
    now: () => NOW,
  };
  return { clock, gateway, repository };
}

function manager(initial: AuthSession | null = null) {
  const values = dependencies(initial);
  return {
    ...values,
    subject: new AuthSessionManager(values.gateway, values.repository, values.clock, {
      refreshLeewayMs: 5_000,
    }),
  };
}

describe("AuthSessionManager", () => {
  it("signs up without treating the response as an authenticated session", async () => {
    const { gateway, repository, subject } = manager();
    const request = {
      email: "test1@example.com",
      inviteCode: "invite",
      password: "strong-password",
      role: "viewer" as const,
      username: "test1",
    };

    await subject.signup(request);

    expect(gateway.signup).toHaveBeenCalledWith(request);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("persists a successful login session", async () => {
    const { repository, subject } = manager();

    await expect(subject.login({
      password: "strong-password",
      username: "test1",
    })).resolves.toEqual(session());
    expect(repository.save).toHaveBeenCalledWith(session());
  });

  it("returns an active in-memory access token without refreshing", async () => {
    const { gateway, subject } = manager(session());

    await expect(subject.accessToken()).resolves.toBe("access-token");
    expect(gateway.refresh).not.toHaveBeenCalled();
  });

  it("restores a browser session through the HttpOnly refresh cookie", async () => {
    const { gateway, repository, subject } = manager();

    await expect(subject.restore()).resolves.toMatchObject({
      accessToken: "refreshed-token",
    });
    expect(gateway.refresh).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("treats a rejected refresh cookie as signed out", async () => {
    const { gateway, repository, subject } = manager();
    vi.mocked(gateway.refresh).mockRejectedValueOnce({ status: 401 });

    await expect(subject.restore()).resolves.toBeNull();
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("surfaces a refresh network failure", async () => {
    const { gateway, repository, subject } = manager();
    vi.mocked(gateway.refresh).mockRejectedValueOnce(new Error("offline"));

    await expect(subject.restore()).rejects.toThrow("offline");
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("logs out remotely and always removes memory credentials", async () => {
    const { gateway, repository, subject } = manager(session());
    vi.mocked(gateway.logout).mockRejectedValueOnce(new Error("offline"));

    await expect(subject.logout()).rejects.toThrow("offline");
    expect(gateway.logout).toHaveBeenCalledWith("access-token");
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("requires authentication when cookie restoration is rejected", async () => {
    const { gateway, subject } = manager();
    vi.mocked(gateway.refresh).mockRejectedValueOnce({ status: 401 });

    await expect(subject.accessToken()).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("rejects a negative refresh leeway", () => {
    const { clock, gateway, repository } = dependencies();

    expect(
      () => new AuthSessionManager(gateway, repository, clock, { refreshLeewayMs: -1 }),
    ).toThrow(RangeError);
  });
});
