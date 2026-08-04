import { describe, expect, it, vi } from "vitest";
import type { AuthenticationGateway, AuthSessionRepository } from "../contracts/authentication";
import { AuthSessionManager } from "./AuthSessionManager";

function dependencies() {
  const session = { credential: "secret", deviceUuid: "device-1" };
  const gateway: AuthenticationGateway = {
    authenticate: vi.fn(async () => session),
    register: vi.fn(async () => ({ ...session, deviceName: "Pixel", status: "active" as const })),
  };
  const repository: AuthSessionRepository = {
    clear: vi.fn(async () => undefined), load: vi.fn(async () => null), save: vi.fn(async () => undefined),
  };
  return { gateway, repository, session };
}

describe("AuthSessionManager", () => {
  it("persists a device only after server authentication", async () => {
    const values = dependencies();
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await expect(manager.authenticate({ credential: "secret", deviceUuid: "device-1" })).resolves.toEqual(values.session);
    expect(values.repository.save).toHaveBeenCalledWith(values.session);
  });

  it("retains the one-time credential returned by registration", async () => {
    const values = dependencies();
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await expect(manager.register({ deviceName: "Pixel", provisioningToken: "token" })).resolves.toEqual(values.session);
    expect(values.repository.save).toHaveBeenCalledWith(values.session);
  });

  it("retains a pending credential while activation remains a server concern", async () => {
    const values = dependencies();
    vi.mocked(values.gateway.register).mockResolvedValueOnce({
      credential: "secret", deviceName: "Pixel", deviceUuid: "device-1", status: "pending",
    });
    const manager = new AuthSessionManager(values.gateway, values.repository);
    await expect(manager.register({ deviceName: "Pixel", provisioningToken: "token" })).resolves.toEqual(values.session);
    expect(values.repository.save).toHaveBeenCalledWith(values.session);
  });
});
