export type AccountRole = "viewer" | "operator" | "admin";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedAccount {
  accessToken: string;
  expiresAt: string;
  role: AccountRole;
  username: string;
}

export interface AuthenticationGateway {
  login(credentials: LoginCredentials): Promise<AuthenticatedAccount>;
  logout(session: AuthenticatedAccount | null): Promise<void>;
  refresh(): Promise<AuthenticatedAccount>;
}

export interface AuthSessionRepository {
  clear(): Promise<void>;
  load(): Promise<AuthenticatedAccount | null>;
  save(session: AuthenticatedAccount): Promise<void>;
}
