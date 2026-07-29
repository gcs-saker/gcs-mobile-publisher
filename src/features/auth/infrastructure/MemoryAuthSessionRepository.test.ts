import { describe, expect, it } from "vitest";
import { MemoryAuthSessionRepository } from "./MemoryAuthSessionRepository";

describe("MemoryAuthSessionRepository", () => {
  it("keeps the access token only in process memory", async () => {
    const repository = new MemoryAuthSessionRepository();
    const session = {
      accessToken: "access",
      expiresAt: 10_000,
      role: "viewer" as const,
      username: "test1",
    };

    await repository.save(session);

    await expect(repository.load()).resolves.toEqual(session);
    await repository.clear();
    await expect(repository.load()).resolves.toBeNull();
  });
});
