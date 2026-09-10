import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedAccount, AuthenticationGateway, AuthSessionRepository } from "../contracts/authentication";
import { AuthSessionManager } from "./AuthSessionManager";

function dependencies() {
  const session: AuthenticatedAccount = {
    accessToken: "access-token", expiresAt: new Date(Date.now() + 60_000).toISOString(),
    role: "operator", username: "operator-a",
  };
  const gateway: AuthenticationGateway = {
    login: vi.fn(async () => session), logout: vi.fn(async () => undefined), refresh: vi.fn(async () => session),
  };
  const repository: AuthSessionRepository = {
    clear: vi.fn(async () => undefined), load: vi.fn(async () => null), save: vi.fn(async () => undefined),
  };
  return { gateway, repository, session };
}

describe("AuthSessionManager", () => {
  it("persists the existing account login session", async () => {
    const values = dependencies();
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await expect(manager.login({ username: "operator-a", password: "secret" })).resolves.toEqual(values.session);
    expect(values.repository.save).toHaveBeenCalledWith(values.session);
  });

  it("restores login through the httpOnly refresh cookie when memory is empty", async () => {
    const values = dependencies();
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await expect(manager.load()).resolves.toEqual(values.session);
    expect(values.gateway.refresh).toHaveBeenCalledOnce();
  });

  it("revokes the server session before clearing memory", async () => {
    const values = dependencies();
    vi.mocked(values.repository.load).mockResolvedValueOnce(values.session);
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await manager.clear();
    expect(values.gateway.logout).toHaveBeenCalledWith(values.session);
    expect(values.repository.clear).toHaveBeenCalledOnce();
  });
});
