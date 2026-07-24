import type {
  SettingsRepository,
  TelemetryQueueRepository,
} from "../contracts/repositories";
import {
  IndexedDbSettingsRepository,
  IndexedDbTelemetryQueueRepository,
  openPublisherDatabase,
} from "../infrastructure/indexedDbRepositories";
import {
  MemorySettingsRepository,
  MemoryTelemetryQueueRepository,
} from "../infrastructure/memoryRepositories";

export interface StorageRepositories {
  settings: SettingsRepository;
  telemetryQueue: TelemetryQueueRepository;
}

export function createMemoryStorage(): StorageRepositories {
  return {
    settings: new MemorySettingsRepository(),
    telemetryQueue: new MemoryTelemetryQueueRepository(),
  };
}

export async function createBrowserStorage(factory: IDBFactory | null): Promise<StorageRepositories> {
  if (!factory) return createMemoryStorage();
  try {
    const database = await openPublisherDatabase(factory);
    return {
      settings: new IndexedDbSettingsRepository(database),
      telemetryQueue: new IndexedDbTelemetryQueueRepository(database),
    };
  } catch {
    return createMemoryStorage();
  }
}
