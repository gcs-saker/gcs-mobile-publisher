import type {
  AuthenticatedDevice,
  AuthenticationGateway,
  AuthSessionRepository,
  DeviceCredential,
  DeviceRegistrationRequest,
} from "../contracts/authentication";

export class AuthSessionManager {
  constructor(
    private readonly gateway: AuthenticationGateway,
    private readonly repository: AuthSessionRepository,
  ) {}

  async authenticate(identity: DeviceCredential): Promise<AuthenticatedDevice> {
    return this.persist(await this.gateway.authenticate(identity));
  }

  async register(request: DeviceRegistrationRequest): Promise<AuthenticatedDevice> {
    const registration = await this.gateway.register(request);
    return this.persist({ credential: registration.credential, deviceUuid: registration.deviceUuid });
  }

  load(): Promise<AuthenticatedDevice | null> {
    return this.repository.load();
  }

  clear(): Promise<void> {
    return this.repository.clear();
  }

  private async persist(session: AuthenticatedDevice): Promise<AuthenticatedDevice> {
    await this.repository.save(session);
    return session;
  }
}
