import { describe, expect, it } from "vitest";
import { emptySnapshot } from "../../../sensors";
import type { QueuedTelemetry } from "../contracts/repositories";
import {
  MemorySettingsRepository,
  MemoryTelemetryQueueRepository,
} from "./memoryRepositories";

function queuedTelemetry(id: string, createdAt: number, expiresAt = 10_000): QueuedTelemetry {
  return {
    attempts: 0,
    createdAt,
    expiresAt,
    id,
    payload: {
      ...emptySnapshot,
      epochTime: 0,
      userAgent: "test",
      uuid: "CID001",
    },
    schemaVersion: 1,
    updatedAt: createdAt,
  };
}

describe("MemorySettingsRepository", () => {
  it("stores defensive copies through the shared repository contract", async () => {
    const repository = new MemorySettingsRepository();
    const settings = {
      preferredQuality: "high" as const,
      schemaVersion: 1,
      updatedAt: 100,
    };
    await repository.put("publisher", settings);
    const stored = await repository.get("publisher");
    expect(stored).toEqual(settings);
    expect(stored).not.toBe(settings);
  });
});

describe("MemoryTelemetryQueueRepository", () => {
  it("returns records in creation order and acknowledges delivery", async () => {
    const repository = new MemoryTelemetryQueueRepository();
    await repository.enqueue(queuedTelemetry("second", 2));
    await repository.enqueue(queuedTelemetry("first", 1));

    expect((await repository.peek(10)).map((record) => record.id)).toEqual(["first", "second"]);
    await repository.acknowledge("first");
    expect(await repository.count()).toBe(1);
  });

  it("prunes expired records without removing active records", async () => {
    const repository = new MemoryTelemetryQueueRepository();
    await repository.enqueue(queuedTelemetry("expired", 1, 5));
    await repository.enqueue(queuedTelemetry("active", 2, 20));

    expect(await repository.prune(10)).toBe(1);
    expect((await repository.peek(10)).map((record) => record.id)).toEqual(["active"]);
  });

  it("rejects invalid limits", async () => {
    const repository = new MemoryTelemetryQueueRepository();
    await expect(repository.peek(-1)).rejects.toThrow(RangeError);
  });
});
