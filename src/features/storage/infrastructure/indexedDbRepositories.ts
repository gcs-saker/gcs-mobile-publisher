import type { SensorSnapshot, TelemetryPayload } from "../../../types";
import type {
  PublisherSettings,
  QueuedTelemetry,
  SettingsRepository,
  TelemetryQueueRepository,
} from "../contracts/repositories";

const DATABASE_VERSION = 2;
const SETTINGS_STORE = "settings";
const TELEMETRY_STORE = "telemetryQueue";
const CREATED_AT_INDEX = "createdAt";

export class StorageQuotaError extends Error {
  constructor(cause: unknown) {
    super("Browser storage quota was exceeded", { cause });
    this.name = "StorageQuotaError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isBooleanOrNull(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function isSensorSnapshot(value: unknown): value is SensorSnapshot {
  if (!isRecord(value)) return false;
  const location = value["location"];
  const orientation = value["orientation"];
  const battery = value["battery"];
  return typeof value["capturedAt"] === "string"
    && isRecord(location)
    && isNumberOrNull(location["latitude"])
    && isNumberOrNull(location["longitude"])
    && isNumberOrNull(location["altitude"])
    && isNumberOrNull(location["accuracy"])
    && isNumberOrNull(location["speed"])
    && isNumberOrNull(location["heading"])
    && isRecord(orientation)
    && isNumberOrNull(orientation["alpha"])
    && isNumberOrNull(orientation["beta"])
    && isNumberOrNull(orientation["gamma"])
    && typeof orientation["absolute"] === "boolean"
    && isRecord(battery)
    && typeof battery["supported"] === "boolean"
    && isNumberOrNull(battery["level"])
    && isBooleanOrNull(battery["charging"]);
}

function isTelemetryPayload(value: unknown): value is TelemetryPayload {
  return isSensorSnapshot(value)
    && isRecord(value)
    && typeof value["uuid"] === "string"
    && typeof value["epochTime"] === "number"
    && typeof value["userAgent"] === "string";
}

function isPublisherSettings(value: unknown): value is PublisherSettings {
  if (!isRecord(value)) return false;
  const quality = value["preferredQuality"];
  return typeof value["schemaVersion"] === "number"
    && typeof value["updatedAt"] === "number"
    && typeof value["streamId"] === "string"
    && (quality === "high" || quality === "medium" || quality === "low");
}

function isQueuedTelemetry(value: unknown): value is QueuedTelemetry {
  return isRecord(value)
    && typeof value["id"] === "string"
    && typeof value["schemaVersion"] === "number"
    && typeof value["updatedAt"] === "number"
    && typeof value["attempts"] === "number"
    && typeof value["createdAt"] === "number"
    && typeof value["expiresAt"] === "number"
    && isTelemetryPayload(value["payload"]);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

export function normalizeStorageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new StorageQuotaError(error);
  }
  return error instanceof Error ? error : new Error("Unknown IndexedDB failure", { cause: error });
}

export function openPublisherDatabase(
  factory: IDBFactory,
  name = "gcs-mobile-publisher",
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE);
      }
      const queue = database.objectStoreNames.contains(TELEMETRY_STORE)
        ? request.transaction?.objectStore(TELEMETRY_STORE)
        : database.createObjectStore(TELEMETRY_STORE, { keyPath: "id" });
      if (queue && !queue.indexNames.contains(CREATED_AT_INDEX)) {
        queue.createIndex(CREATED_AT_INDEX, "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
  });
}

abstract class IndexedDbRepository {
  constructor(protected readonly database: IDBDatabase) {}

  protected async write(
    storeName: string,
    operation: (store: IDBObjectStore) => void,
  ): Promise<void> {
    try {
      const transaction = this.database.transaction(storeName, "readwrite");
      operation(transaction.objectStore(storeName));
      await transactionDone(transaction);
    } catch (error: unknown) {
      throw normalizeStorageError(error);
    }
  }
}

export class IndexedDbSettingsRepository
  extends IndexedDbRepository
  implements SettingsRepository {
  async get(key: "publisher"): Promise<PublisherSettings | null> {
    const transaction = this.database.transaction(SETTINGS_STORE, "readonly");
    const raw: unknown = await requestResult(transaction.objectStore(SETTINGS_STORE).get(key));
    await transactionDone(transaction);
    if (raw === undefined) return null;
    if (isPublisherSettings(raw)) return raw;
    await this.remove(key);
    return null;
  }

  async put(key: "publisher", value: PublisherSettings): Promise<void> {
    await this.write(SETTINGS_STORE, (store) => {
      store.put(value, key);
    });
  }

  async remove(key: "publisher"): Promise<void> {
    await this.write(SETTINGS_STORE, (store) => {
      store.delete(key);
    });
  }
}

export class IndexedDbTelemetryQueueRepository
  extends IndexedDbRepository
  implements TelemetryQueueRepository {
  async acknowledge(id: string): Promise<void> {
    await this.write(TELEMETRY_STORE, (store) => {
      store.delete(id);
    });
  }

  async count(): Promise<number> {
    const transaction = this.database.transaction(TELEMETRY_STORE, "readonly");
    const result = await requestResult(transaction.objectStore(TELEMETRY_STORE).count());
    await transactionDone(transaction);
    return result;
  }

  async enqueue(record: QueuedTelemetry): Promise<void> {
    await this.write(TELEMETRY_STORE, (store) => {
      store.put(record);
    });
  }

  async peek(limit: number): Promise<readonly QueuedTelemetry[]> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError("Queue limit must be a non-negative integer");
    }
    const transaction = this.database.transaction(TELEMETRY_STORE, "readonly");
    const raw: unknown = await requestResult(
      transaction.objectStore(TELEMETRY_STORE).index(CREATED_AT_INDEX).getAll(undefined, limit),
    );
    await transactionDone(transaction);
    if (!Array.isArray(raw)) return [];
    const valid: QueuedTelemetry[] = [];
    const corruptIds: string[] = [];
    raw.forEach((value: unknown) => {
      if (isQueuedTelemetry(value)) valid.push(value);
      else if (isRecord(value) && typeof value["id"] === "string") corruptIds.push(value["id"]);
    });
    await Promise.all(corruptIds.map((id) => this.acknowledge(id)));
    return valid;
  }

  async prune(expiredBefore: number): Promise<number> {
    const transaction = this.database.transaction(TELEMETRY_STORE, "readwrite");
    const store = transaction.objectStore(TELEMETRY_STORE);
    let removed = 0;
    await new Promise<void>((resolve, reject) => {
      const cursorRequest = store.openCursor();
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Queue cursor failed"));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        const value: unknown = cursor.value;
        if (!isQueuedTelemetry(value) || value.expiresAt <= expiredBefore) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
    });
    await transactionDone(transaction);
    return removed;
  }
}
