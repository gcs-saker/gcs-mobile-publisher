import type {
  AuthSession,
  AuthenticationGateway,
  LoginRequest,
  SignupRequest,
  SignupResponse,
  UserRole,
} from "../contracts/authentication";

export interface AuthenticationApiConfiguration {
  baseUrl: string;
  now(): number;
}

export class AuthenticationApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthenticationApiError";
  }
}

interface JsonHeaders extends Record<string, string> {
  Accept: "application/json";
  "Content-Type": "application/json";
  "X-GCS-CSRF": "same-origin";
}

const JSON_HEADERS: JsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-GCS-CSRF": "same-origin",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "viewer" || value === "operator" || value === "admin";
}

function decodeSession(value: unknown, now: number): AuthSession {
  if (!isRecord(value)) throw new TypeError("Invalid authentication response");
  const {
    access_token: accessToken,
    expires_in_minutes: expiresInMinutes,
    role,
    token_type: tokenType,
    username,
  } = value;
  if (
    typeof accessToken !== "string"
    || typeof expiresInMinutes !== "number"
    || !Number.isFinite(expiresInMinutes)
    || expiresInMinutes <= 0
    || !isUserRole(role)
    || tokenType !== "bearer"
    || typeof username !== "string"
  ) {
    throw new TypeError("Invalid authentication response");
  }
  return {
    accessToken,
    expiresAt: now + expiresInMinutes * 60_000,
    role,
    username,
  };
}

function decodeSignup(value: unknown): SignupResponse {
  if (!isRecord(value)) throw new TypeError("Invalid signup response");
  const {
    company_id: companyId,
    email,
    id,
    role,
    username,
  } = value;
  if (
    typeof companyId !== "number"
    || typeof email !== "string"
    || typeof id !== "number"
    || !isUserRole(role)
    || typeof username !== "string"
  ) {
    throw new TypeError("Invalid signup response");
  }
  return { companyId, email, id, role, username };
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload["detail"] === "string") {
      return payload["detail"];
    }
  } catch {
    // The stable fallback below avoids exposing an arbitrary response body.
  }
  return "Authentication request failed";
}

export class HttpAuthenticationGateway implements AuthenticationGateway {
  private readonly baseUrl: string;

  constructor(
    private readonly configuration: AuthenticationApiConfiguration,
    private readonly fetcher: typeof fetch,
  ) {
    this.baseUrl = configuration.baseUrl.replace(/\/$/, "");
  }

  async signup(request: SignupRequest): Promise<SignupResponse> {
    const response = await this.post("/signup", request);
    await this.assertOk(response);
    return decodeSignup(await response.json());
  }

  async login(request: LoginRequest): Promise<AuthSession> {
    return this.requestSession("/login", request);
  }

  async refresh(): Promise<AuthSession> {
    return this.requestSession("/refresh");
  }

  async logout(accessToken: string | null): Promise<void> {
    const headers: Record<string, string> = { ...JSON_HEADERS };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const response = await this.post("/logout", undefined, headers);
    await this.assertOk(response);
  }

  private async requestSession(path: string, body?: object): Promise<AuthSession> {
    const response = await this.post(path, body);
    await this.assertOk(response);
    const payload: unknown = await response.json();
    return decodeSession(payload, this.configuration.now());
  }

  private async assertOk(response: Response): Promise<void> {
    if (!response.ok) {
      throw new AuthenticationApiError(await errorDetail(response), response.status);
    }
  }

  private post(
    path: string,
    body?: object,
    headers: Record<string, string> = JSON_HEADERS,
  ): Promise<Response> {
    return this.fetcher(`${this.baseUrl}${path}`, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: "include",
      headers,
      method: "POST",
    });
  }
}
