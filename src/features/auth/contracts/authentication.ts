export type DeviceLifecycleStatus = "pending" | "active" | "disabled";

export interface DeviceCredential {
  credential: string;
  deviceUuid: string;
}

export interface AuthenticatedDevice extends DeviceCredential {}

export interface DeviceRegistrationRequest {
  deviceName: string;
  provisioningToken: string;
}

export interface DeviceRegistration extends DeviceCredential {
  deviceName: string;
  status: DeviceLifecycleStatus;
}

export interface AuthenticationGateway {
  authenticate(credential: DeviceCredential): Promise<AuthenticatedDevice>;
  register(request: DeviceRegistrationRequest): Promise<DeviceRegistration>;
}

export interface AuthSessionRepository {
  clear(): Promise<void>;
  load(): Promise<AuthenticatedDevice | null>;
  save(session: AuthenticatedDevice): Promise<void>;
}
