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
    deviceId: "device-1",
    expiresAt: NOW + 60_000,
    refreshToken: "refresh-token",
    ...overrides,
  };
}

function dependencies(initial: AuthSession | null = null) {
  let stored = initial;
  const gateway: AuthenticationGateway = {
    login: vi.fn(async () => session()),
    refresh: vi.fn(async () => session({ accessToken: "refreshed-token" })),
    registerDevice: vi.fn(async () => session()),
    revoke: vi.fn(async () => undefined),
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
  it("persists a device registration session", async () => {
    const { gateway, repository, subject } = manager();
    const request = { deviceName: "Pixel", registrationCode: "ABC-123" };

    await expect(subject.registerDevice(request)).resolves.toEqual(session());
    expect(gateway.registerDevice).toHaveBeenCalledWith(request);
    expect(repository.save).toHaveBeenCalledWith(session());
  });

  it("returns an active persisted access token without refreshing", async () => {
    const { gateway, subject } = manager(session());

    await expect(subject.accessToken()).resolves.toBe("access-token");
    expect(gateway.refresh).not.toHaveBeenCalled();
  });

  it("refreshes and persists a session before its access token expires", async () => {
    const expiring = session({ expiresAt: NOW + 5_000 });
    const { gateway, repository, subject } = manager(expiring);

    await expect(subject.accessToken()).resolves.toBe("refreshed-token");
    expect(gateway.refresh).toHaveBeenCalledWith("refresh-token");
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "refreshed-token" }),
    );
  });

  it("clears an expired non-refreshable session", async () => {
    const { repository, subject } = manager(
      session({ expiresAt: NOW - 1, refreshToken: null }),
    );

    await expect(subject.accessToken()).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("clears credentials when refresh is rejected", async () => {
    const { gateway, repository, subject } = manager(
      session({ expiresAt: NOW - 1 }),
    );
    vi.mocked(gateway.refresh).mockRejectedValueOnce(new Error("revoked"));

    await expect(subject.restore()).rejects.toThrow("revoked");
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("revokes remotely and always removes local credentials on logout", async () => {
    const { gateway, repository, subject } = manager(session());
    vi.mocked(gateway.revoke).mockRejectedValueOnce(new Error("offline"));

    await expect(subject.logout()).rejects.toThrow("offline");
    expect(gateway.revoke).toHaveBeenCalledWith("access-token");
    expect(repository.clear).toHaveBeenCalledOnce();
  });

  it("rejects a negative refresh leeway", () => {
    const { clock, gateway, repository } = dependencies();

    expect(
      () => new AuthSessionManager(gateway, repository, clock, { refreshLeewayMs: -1 }),
    ).toThrow(RangeError);
  });
});
