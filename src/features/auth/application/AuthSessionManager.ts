import type { Clock } from "../../../app/ports";
import type {
  AuthSession,
  AuthSessionRepository,
  AuthenticationGateway,
  LoginRequest,
  SignupRequest,
  SignupResponse,
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

  signup(request: SignupRequest): Promise<SignupResponse> {
    return this.gateway.signup(request);
  }

  async restore(): Promise<AuthSession | null> {
    const session = await this.repository.load();
    if (session && !this.requiresRefresh(session)) return session;
    try {
      return await this.persist(await this.gateway.refresh());
    } catch (reason) {
      await this.repository.clear();
      if (isUnauthorized(reason)) return null;
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
      await this.gateway.logout(session?.accessToken ?? null);
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

function isUnauthorized(reason: unknown): boolean {
  return typeof reason === "object"
    && reason !== null
    && "status" in reason
    && reason.status === 401;
}
