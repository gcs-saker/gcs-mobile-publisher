import type { AuthenticatedAccount, AuthSessionRepository } from "../contracts/authentication";

export class MemoryAuthSessionRepository implements AuthSessionRepository {
  private session: AuthenticatedAccount | null = null;

  async clear(): Promise<void> {
    this.session = null;
  }

  async load(): Promise<AuthenticatedAccount | null> {
    return this.session ? { ...this.session } : null;
  }

  async save(session: AuthenticatedAccount): Promise<void> {
    this.session = { ...session };
  }
}
