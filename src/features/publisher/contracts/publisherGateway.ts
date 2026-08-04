import type { DeviceCredential } from "../../auth/contracts/authentication";
import type { PublishSession, TelemetryPayload } from "../../../types";

export interface PublisherGateway {
  create(identity: DeviceCredential, sensorId?: string): Promise<PublishSession>;
  end(session: PublishSession): Promise<void>;
  renew(session: PublishSession): Promise<PublishSession>;
  sendTelemetry(payload: TelemetryPayload, identity: DeviceCredential): Promise<void>;
}
