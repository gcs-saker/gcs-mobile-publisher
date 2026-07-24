import { describe, expect, it } from "vitest";
import { createBrowserStorage, createMemoryStorage } from "./storageRuntime";
import {
  MemorySettingsRepository,
  MemoryTelemetryQueueRepository,
} from "../infrastructure/memoryRepositories";

describe("storage runtime", () => {
  it("provides replaceable memory repositories", () => {
    const storage = createMemoryStorage();
    expect(storage.settings).toBeInstanceOf(MemorySettingsRepository);
    expect(storage.telemetryQueue).toBeInstanceOf(MemoryTelemetryQueueRepository);
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    const storage = await createBrowserStorage(null);
    expect(storage.settings).toBeInstanceOf(MemorySettingsRepository);
    expect(storage.telemetryQueue).toBeInstanceOf(MemoryTelemetryQueueRepository);
  });
});
