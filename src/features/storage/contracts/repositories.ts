import type { TelemetryPayload } from "../../../types";
import type { VideoQuality } from "../../../quality";

export interface VersionedRecord {
  schemaVersion: number;
  updatedAt: number;
}

export interface IdentifiedRecord {
  id: string;
}

export interface ReadRepository<TKey, TValue> {
  get(key: TKey): Promise<TValue | null>;
}

export interface WriteRepository<TKey, TValue> extends ReadRepository<TKey, TValue> {
  put(key: TKey, value: TValue): Promise<void>;
  remove(key: TKey): Promise<void>;
}

export interface PublisherSettings extends VersionedRecord {
  preferredQuality: VideoQuality;
}

export interface QueuedTelemetry extends VersionedRecord, IdentifiedRecord {
  attempts: number;
  createdAt: number;
  expiresAt: number;
  payload: TelemetryPayload;
}

export interface SettingsRepository
  extends WriteRepository<"publisher", PublisherSettings> {}

export interface TelemetryQueueRepository {
  acknowledge(id: string): Promise<void>;
  count(): Promise<number>;
  enqueue(record: QueuedTelemetry): Promise<void>;
  peek(limit: number): Promise<readonly QueuedTelemetry[]>;
  prune(expiredBefore: number): Promise<number>;
}
