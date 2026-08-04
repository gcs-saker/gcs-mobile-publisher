import { describe, expect, it } from "vitest";
import { MemoryAuthSessionRepository } from "./MemoryAuthSessionRepository";

describe("MemoryAuthSessionRepository", () => {
  it("keeps device credentials only in process memory and returns copies", async () => {
    const repository = new MemoryAuthSessionRepository();
    const session = { credential: "secret", deviceUuid: "device-1" };
    await repository.save(session);
    await expect(repository.load()).resolves.toEqual(session);
    await repository.clear();
    await expect(repository.load()).resolves.toBeNull();
  });
});
