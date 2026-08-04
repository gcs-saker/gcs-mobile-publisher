import type {
  AuthenticatedDevice,
  AuthenticationGateway,
  DeviceCredential,
  DeviceLifecycleStatus,
  DeviceRegistration,
  DeviceRegistrationRequest,
} from "../contracts/authentication";

export interface AuthenticationApiConfiguration {
  baseUrl: string;
}

export class AuthenticationApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthenticationApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLifecycleStatus(value: unknown): value is DeviceLifecycleStatus {
  return value === "pending" || value === "active" || value === "disabled";
}

function decodeAuthentication(value: unknown, credential: string): AuthenticatedDevice {
  if (!isRecord(value)) throw new TypeError("Invalid device authentication response");
  const { deviceUuid } = value;
  if (typeof deviceUuid !== "string") {
    throw new TypeError("Invalid device authentication response");
  }
  return { credential, deviceUuid };
}

function decodeRegistration(value: unknown): DeviceRegistration {
  if (!isRecord(value)) throw new TypeError("Invalid device registration response");
  const { credential, deviceUuid, displayName, status } = value;
  if (
    typeof credential !== "string"
    || typeof deviceUuid !== "string"
    || typeof displayName !== "string"
    || !isLifecycleStatus(status)
  ) {
    throw new TypeError("Invalid device registration response");
  }
  return { credential, deviceName: displayName, deviceUuid, status };
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload["detail"] === "string") return payload["detail"];
  } catch {
    // Use the stable fallback below.
  }
  return "기기 인증 요청에 실패했습니다.";
}

export class HttpAuthenticationGateway implements AuthenticationGateway {
  private readonly baseUrl: string;

  constructor(configuration: AuthenticationApiConfiguration, private readonly fetcher: typeof fetch) {
    this.baseUrl = configuration.baseUrl.replace(/\/$/, "");
  }

  async authenticate(identity: DeviceCredential): Promise<AuthenticatedDevice> {
    const response = await this.post("/policy/devices/authenticate", identity);
    await this.assertOk(response);
    return decodeAuthentication(await response.json(), identity.credential);
  }

  async register(request: DeviceRegistrationRequest): Promise<DeviceRegistration> {
    const response = await this.post("/device-bootstrap/register", {
      deviceType: "mobile",
      displayName: request.deviceName,
      provisioningToken: request.provisioningToken,
      sensors: [{ sensorId: "front", sensorType: "camera" }],
    });
    await this.assertOk(response);
    return decodeRegistration(await response.json());
  }

  private async assertOk(response: Response): Promise<void> {
    if (!response.ok) throw new AuthenticationApiError(await errorDetail(response), response.status);
  }

  private post(path: string, body: object): Promise<Response> {
    return this.fetcher(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    });
  }
}
