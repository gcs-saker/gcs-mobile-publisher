import type {
  AuthenticatedAccount,
  AuthenticationGateway,
  AuthSessionRepository,
  LoginCredentials,
} from "../contracts/authentication";

export class AuthSessionManager {
  constructor(private readonly gateway: AuthenticationGateway, private readonly repository: AuthSessionRepository) {}

  async login(credentials: LoginCredentials): Promise<AuthenticatedAccount> {
    return this.persist(await this.gateway.login(credentials));
  }

  async load(): Promise<AuthenticatedAccount | null> {
    const memorySession = await this.repository.load();
    if (memorySession && Date.parse(memorySession.expiresAt) > Date.now()) return memorySession;
    try {
      return this.persist(await this.gateway.refresh());
    } catch {
      await this.repository.clear();
      return null;
    }
  }

  async clear(): Promise<void> {
    const session = await this.repository.load();
    try { await this.gateway.logout(session); } finally { await this.repository.clear(); }
  }

  private async persist(session: AuthenticatedAccount): Promise<AuthenticatedAccount> {
    await this.repository.save(session);
    return session;
  }
}
