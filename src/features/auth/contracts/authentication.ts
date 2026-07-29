export type UserRole = "viewer" | "operator" | "admin";

export interface AuthenticatedUser {
  role: UserRole;
  username: string;
}

export interface AuthSession extends AuthenticatedUser {
  accessToken: string;
  expiresAt: number;
}

export interface SignupRequest {
  email: string;
  inviteCode: string;
  password: string;
  role: "viewer";
  username: string;
}

export interface SignupResponse extends AuthenticatedUser {
  companyId: number;
  email: string;
  id: number;
}

export interface LoginRequest {
  password: string;
  username: string;
}

export interface AuthenticationGateway {
  login(request: LoginRequest): Promise<AuthSession>;
  logout(accessToken: string | null): Promise<void>;
  refresh(): Promise<AuthSession>;
  signup(request: SignupRequest): Promise<SignupResponse>;
}

export interface AuthSessionRepository {
  clear(): Promise<void>;
  load(): Promise<AuthSession | null>;
  save(session: AuthSession): Promise<void>;
}
