import type { SessionStore } from "../../../app/ports";
import type {
  AuthSession,
  AuthSessionRepository,
} from "../contracts/authentication";

const STORAGE_KEY = "gcs.authSession";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeSession(value: unknown): AuthSession | null {
  if (!isRecord(value)) return null;
  const { accessToken, deviceId, expiresAt, refreshToken } = value;
  if (
    typeof accessToken !== "string"
    || typeof deviceId !== "string"
    || typeof expiresAt !== "number"
    || (typeof refreshToken !== "string" && refreshToken !== null)
  ) {
    return null;
  }
  return { accessToken, deviceId, expiresAt, refreshToken };
}

export class SessionAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly storage: SessionStore) {}

  async clear(): Promise<void> {
    this.storage.remove(STORAGE_KEY);
  }

  async load(): Promise<AuthSession | null> {
    const serialized = this.storage.get(STORAGE_KEY);
    if (!serialized) return null;
    try {
      const session = decodeSession(JSON.parse(serialized));
      if (session) return session;
    } catch {
      // Corrupt credentials are removed below.
    }
    await this.clear();
    return null;
  }

  async save(session: AuthSession): Promise<void> {
    this.storage.set(STORAGE_KEY, JSON.stringify(session));
  }
}
