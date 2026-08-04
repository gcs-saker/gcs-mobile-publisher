import type { AuthenticatedDevice, AuthSessionRepository } from "../contracts/authentication";

export class MemoryAuthSessionRepository implements AuthSessionRepository {
  private session: AuthenticatedDevice | null = null;

  async clear(): Promise<void> {
    this.session = null;
  }

  async load(): Promise<AuthenticatedDevice | null> {
    return this.session ? { ...this.session } : null;
  }

  async save(session: AuthenticatedDevice): Promise<void> {
    this.session = { ...session };
  }
}
