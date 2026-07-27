import type {
  AuthSession,
  AuthenticationGateway,
  DeviceRegistrationRequest,
  LoginRequest,
} from "../contracts/authentication";

export interface AuthenticationApiConfiguration {
  baseUrl: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeSession(value: unknown): AuthSession {
  if (!isRecord(value)) throw new TypeError("Invalid authentication response");
  const { accessToken, deviceId, expiresAt, refreshToken } = value;
  if (
    typeof accessToken !== "string"
    || typeof deviceId !== "string"
    || typeof expiresAt !== "number"
    || (typeof refreshToken !== "string" && refreshToken !== null)
  ) {
    throw new TypeError("Invalid authentication response");
  }
  return { accessToken, deviceId, expiresAt, refreshToken };
}

export class HttpAuthenticationGateway implements AuthenticationGateway {
  private readonly baseUrl: string;

  constructor(
    configuration: AuthenticationApiConfiguration,
    private readonly fetcher: typeof fetch,
  ) {
    this.baseUrl = configuration.baseUrl.replace(/\/$/, "");
  }

  login(request: LoginRequest): Promise<AuthSession> {
    return this.requestSession("/api/v1/auth/devices/login", request);
  }

  refresh(refreshToken: string): Promise<AuthSession> {
    return this.requestSession("/api/v1/auth/refresh", { refreshToken });
  }

  registerDevice(request: DeviceRegistrationRequest): Promise<AuthSession> {
    return this.requestSession("/api/v1/auth/devices/register", request);
  }

  async revoke(accessToken: string): Promise<void> {
    const response = await this.post("/api/v1/auth/revoke", { accessToken });
    if (!response.ok) throw new AuthenticationApiError("Token revocation failed", response.status);
  }

  private async requestSession(path: string, body: object): Promise<AuthSession> {
    const response = await this.post(path, body);
    if (!response.ok) {
      throw new AuthenticationApiError("Authentication request failed", response.status);
    }
    const payload: unknown = await response.json();
    return decodeSession(payload);
  }

  private post(path: string, body: object): Promise<Response> {
    return this.fetcher(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  }
}
