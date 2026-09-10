import type {
  AccountRole,
  AuthenticatedAccount,
  AuthenticationGateway,
  LoginCredentials,
} from "../contracts/authentication";

export interface AuthenticationApiConfiguration { baseUrl: string }

export class AuthenticationApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthenticationApiError";
  }
}

const CSRF_HEADERS = { "X-GCS-CSRF": "same-origin" } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRole(value: unknown): value is AccountRole {
  return value === "viewer" || value === "operator" || value === "admin";
}

function decodeSession(value: unknown): AuthenticatedAccount {
  if (!isRecord(value)) throw new TypeError("Invalid login response");
  const accessToken = value["access_token"];
  const expiresInMinutes = value["expires_in_minutes"];
  const { role, username } = value;
  if (typeof accessToken !== "string" || typeof expiresInMinutes !== "number"
    || typeof username !== "string" || !isRole(role)) {
    throw new TypeError("Invalid login response");
  }
  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60_000).toISOString(),
    role,
    username,
  };
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload["detail"] === "string") return payload["detail"];
  } catch { /* stable fallback below */ }
  return `로그인 요청에 실패했습니다. (${response.status})`;
}

export class HttpAuthenticationGateway implements AuthenticationGateway {
  private readonly baseUrl: string;

  constructor(configuration: AuthenticationApiConfiguration, private readonly fetcher: typeof fetch) {
    this.baseUrl = configuration.baseUrl.replace(/\/$/, "");
  }

  async login(credentials: LoginCredentials): Promise<AuthenticatedAccount> {
    return this.tokenRequest("/auth/login", JSON.stringify(credentials));
  }

  async refresh(): Promise<AuthenticatedAccount> {
    return this.tokenRequest("/auth/refresh");
  }

  async logout(session: AuthenticatedAccount | null): Promise<void> {
    const response = await this.fetcher(`${this.baseUrl}/auth/logout`, {
      credentials: "include",
      headers: { ...CSRF_HEADERS, ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
      method: "POST",
    });
    if (!response.ok) throw new AuthenticationApiError(await errorDetail(response), response.status);
  }

  private async tokenRequest(path: string, body?: string): Promise<AuthenticatedAccount> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...(body ? { body } : {}),
      credentials: "include",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...CSRF_HEADERS },
      method: "POST",
    });
    if (!response.ok) throw new AuthenticationApiError(await errorDetail(response), response.status);
    return decodeSession(await response.json());
  }
}
