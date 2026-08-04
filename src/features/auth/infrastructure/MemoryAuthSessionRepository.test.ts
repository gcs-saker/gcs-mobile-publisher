import { describe, expect, it } from "vitest";
import { MemoryAuthSessionRepository } from "./MemoryAuthSessionRepository";

describe("MemoryAuthSessionRepository", () => {
  it("keeps account access tokens only in process memory and returns copies", async () => {
    const repository = new MemoryAuthSessionRepository();
    const session = { accessToken: "token", expiresAt: "2099-01-01T00:00:00Z", role: "operator" as const, username: "operator-a" };
    await repository.save(session);
    await expect(repository.load()).resolves.toEqual(session);
    await repository.clear();
    await expect(repository.load()).resolves.toBeNull();
  });
});
