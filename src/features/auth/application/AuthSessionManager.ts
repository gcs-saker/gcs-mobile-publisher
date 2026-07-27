import type { Clock } from "../../../app/ports";
import type {
  AuthSession,
  AuthSessionRepository,
  AuthenticationGateway,
  DeviceRegistrationRequest,
  LoginRequest,
} from "../contracts/authentication";

export interface AuthSessionManagerOptions {
  refreshLeewayMs: number;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthSessionManager {
  constructor(
    private readonly gateway: AuthenticationGateway,
    private readonly repository: AuthSessionRepository,
    private readonly clock: Clock,
    private readonly options: AuthSessionManagerOptions,
  ) {
    if (options.refreshLeewayMs < 0) {
      throw new RangeError("refreshLeewayMs must not be negative");
    }
  }

  async login(request: LoginRequest): Promise<AuthSession> {
    return this.persist(await this.gateway.login(request));
  }

  async registerDevice(request: DeviceRegistrationRequest): Promise<AuthSession> {
    return this.persist(await this.gateway.registerDevice(request));
  }

  async restore(): Promise<AuthSession | null> {
    const session = await this.repository.load();
    if (!session) return null;
    if (!this.requiresRefresh(session)) return session;
    if (!session.refreshToken) {
      await this.repository.clear();
      return null;
    }
    try {
      return await this.persist(await this.gateway.refresh(session.refreshToken));
    } catch (reason) {
      await this.repository.clear();
      throw reason;
    }
  }

  async accessToken(): Promise<string> {
    const session = await this.restore();
    if (!session) throw new AuthenticationRequiredError();
    return session.accessToken;
  }

  async logout(): Promise<void> {
    const session = await this.repository.load();
    try {
      if (session) await this.gateway.revoke(session.accessToken);
    } finally {
      await this.repository.clear();
    }
  }

  private requiresRefresh(session: AuthSession): boolean {
    return session.expiresAt <= this.clock.now() + this.options.refreshLeewayMs;
  }

  private async persist(session: AuthSession): Promise<AuthSession> {
    await this.repository.save(session);
    return session;
  }
}
