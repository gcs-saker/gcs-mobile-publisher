import type {
  AuthSession,
  AuthSessionRepository,
} from "../contracts/authentication";

export class MemoryAuthSessionRepository implements AuthSessionRepository {
  private session: AuthSession | null = null;

  async clear(): Promise<void> {
    this.session = null;
  }

  async load(): Promise<AuthSession | null> {
    return this.session;
  }

  async save(session: AuthSession): Promise<void> {
    this.session = session;
  }
}
