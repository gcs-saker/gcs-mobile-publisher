import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { emptySnapshot } from "../../../sensors";
import type { QueuedTelemetry } from "../contracts/repositories";
import {
  IndexedDbSettingsRepository,
  IndexedDbTelemetryQueueRepository,
  normalizeStorageError,
  openPublisherDatabase,
  StorageQuotaError,
} from "./indexedDbRepositories";

function queueRecord(id: string, createdAt: number, expiresAt = 10_000): QueuedTelemetry {
  return {
    attempts: 0,
    createdAt,
    expiresAt,
    id,
    payload: {
      ...emptySnapshot,
      capturedAt: new Date(createdAt).toISOString(),
      epochTime: 0,
      userAgent: "test",
      uuid: "CID001",
    },
    schemaVersion: 1,
    updatedAt: createdAt,
  };
}

async function database(): Promise<IDBDatabase> {
  return openPublisherDatabase(new IDBFactory(), `test-${crypto.randomUUID()}`);
}

function openLegacyDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("settings");
      request.result.createObjectStore("telemetryQueue", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Legacy database setup failed"));
  });
}

describe("IndexedDB repositories", () => {
  it("creates the versioned schema and persists settings", async () => {
    const db = await database();
    expect([...db.objectStoreNames]).toEqual(["settings", "telemetryQueue"]);
    const repository = new IndexedDbSettingsRepository(db);
    await repository.put("publisher", {
      preferredQuality: "medium",
      schemaVersion: 1,
      updatedAt: 10,
    });
    await expect(repository.get("publisher")).resolves.toMatchObject({
      preferredQuality: "medium",
    });
    db.close();
  });

  it("migrates the legacy queue by adding the creation-order index", async () => {
    const factory = new IDBFactory();
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = await openLegacyDatabase(factory, name);
    legacy.close();

    const migrated = await openPublisherDatabase(factory, name);
    const transaction = migrated.transaction("telemetryQueue", "readonly");
    expect([...transaction.objectStore("telemetryQueue").indexNames]).toContain("createdAt");
    migrated.close();
  });

  it("removes a corrupt settings record instead of leaking an unsafe value", async () => {
    const db = await database();
    const transaction = db.transaction("settings", "readwrite");
    transaction.objectStore("settings").put({ streamId: 42 }, "publisher");
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
    });
    const repository = new IndexedDbSettingsRepository(db);
    await expect(repository.get("publisher")).resolves.toBeNull();
    await expect(repository.get("publisher")).resolves.toBeNull();
    db.close();
  });

  it("orders, acknowledges, and prunes telemetry records", async () => {
    const db = await database();
    const repository = new IndexedDbTelemetryQueueRepository(db);
    await repository.enqueue(queueRecord("second", 2));
    await repository.enqueue(queueRecord("first", 1, 5));
    await expect(repository.peek(10)).resolves.toEqual([
      expect.objectContaining({ id: "first" }),
      expect.objectContaining({ id: "second" }),
    ]);
    await expect(repository.prune(5)).resolves.toBe(1);
    await repository.acknowledge("second");
    await expect(repository.count()).resolves.toBe(0);
    db.close();
  });

  it("drops corrupt queue records while returning valid records", async () => {
    const db = await database();
    const transaction = db.transaction("telemetryQueue", "readwrite");
    transaction.objectStore("telemetryQueue").put({ id: "corrupt", createdAt: 0 });
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
    });
    const repository = new IndexedDbTelemetryQueueRepository(db);
    await expect(repository.peek(10)).resolves.toEqual([]);
    await expect(repository.count()).resolves.toBe(0);
    db.close();
  });

  it("normalizes quota failures without erasing the original cause", () => {
    const cause = new DOMException("full", "QuotaExceededError");
    const error = normalizeStorageError(cause);
    expect(error).toBeInstanceOf(StorageQuotaError);
    expect(error.cause).toBe(cause);
  });
});
