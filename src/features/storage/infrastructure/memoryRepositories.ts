import type {
  PublisherSettings,
  QueuedTelemetry,
  SettingsRepository,
  TelemetryQueueRepository,
} from "../contracts/repositories";

function cloneSettings(value: PublisherSettings): PublisherSettings {
  return { ...value };
}

function cloneTelemetry(value: QueuedTelemetry): QueuedTelemetry {
  return {
    ...value,
    payload: {
      ...value.payload,
      battery: { ...value.payload.battery },
      location: { ...value.payload.location },
      orientation: { ...value.payload.orientation },
    },
  };
}

export class MemorySettingsRepository implements SettingsRepository {
  private value: PublisherSettings | null = null;

  async get(key: "publisher"): Promise<PublisherSettings | null> {
    void key;
    return this.value ? cloneSettings(this.value) : null;
  }

  async put(key: "publisher", value: PublisherSettings): Promise<void> {
    void key;
    this.value = cloneSettings(value);
  }

  async remove(key: "publisher"): Promise<void> {
    void key;
    this.value = null;
  }
}

export class MemoryTelemetryQueueRepository implements TelemetryQueueRepository {
  private readonly records = new Map<string, QueuedTelemetry>();

  async acknowledge(id: string): Promise<void> {
    this.records.delete(id);
  }

  async count(): Promise<number> {
    return this.records.size;
  }

  async enqueue(record: QueuedTelemetry): Promise<void> {
    this.records.set(record.id, cloneTelemetry(record));
  }

  async peek(limit: number): Promise<readonly QueuedTelemetry[]> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError("Queue limit must be a non-negative integer");
    }
    return [...this.records.values()]
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(0, limit)
      .map(cloneTelemetry);
  }

  async prune(expiredBefore: number): Promise<number> {
    const expiredIds = [...this.records.values()]
      .filter((record) => record.expiresAt <= expiredBefore)
      .map((record) => record.id);
    expiredIds.forEach((id) => this.records.delete(id));
    return expiredIds.length;
  }
}
