import { describe, expect, it } from "vitest";
import type { SessionStore } from "../../../app/ports";
import type { AuthSession } from "../contracts/authentication";
import { SessionAuthSessionRepository } from "./SessionAuthSessionRepository";

function storage(initial: string | null = null) {
  let value = initial;
  const adapter: SessionStore = {
    get: () => value,
    remove: () => {
      value = null;
    },
    set: (_key, nextValue) => {
      value = nextValue;
    },
  };
  return { adapter, read: () => value };
}

const SESSION: AuthSession = {
  accessToken: "access",
  deviceId: "device-1",
  expiresAt: 10_000,
  refreshToken: "refresh",
};

describe("SessionAuthSessionRepository", () => {
  it("round-trips only the session contract", async () => {
    const memory = storage();
    const repository = new SessionAuthSessionRepository(memory.adapter);

    await repository.save(SESSION);

    expect(await repository.load()).toEqual(SESSION);
    expect(memory.read()).not.toContain("registrationCode");
    expect(memory.read()).not.toContain("secret");
  });

  it.each(["not-json", "{}", '{"accessToken":1}'])(
    "removes corrupt credentials: %s",
    async (serialized) => {
      const memory = storage(serialized);
      const repository = new SessionAuthSessionRepository(memory.adapter);

      await expect(repository.load()).resolves.toBeNull();
      expect(memory.read()).toBeNull();
    },
  );
});
