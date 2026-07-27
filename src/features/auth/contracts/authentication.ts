export interface AccessCredential {
  accessToken: string;
  expiresAt: number;
}

export interface RefreshableCredential extends AccessCredential {
  refreshToken: string;
}

export interface AuthSession extends AccessCredential {
  deviceId: string;
  refreshToken: string | null;
}

export interface DeviceRegistrationRequest {
  deviceName: string;
  registrationCode: string;
}

export interface LoginRequest {
  deviceId: string;
  secret: string;
}

export interface AuthenticationGateway {
  login(request: LoginRequest): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  registerDevice(request: DeviceRegistrationRequest): Promise<AuthSession>;
  revoke(accessToken: string): Promise<void>;
}

export interface AuthSessionRepository {
  clear(): Promise<void>;
  load(): Promise<AuthSession | null>;
  save(session: AuthSession): Promise<void>;
}
