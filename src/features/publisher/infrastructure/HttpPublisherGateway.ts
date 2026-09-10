import { createPublishSession, endPublishSession, renewPublishSession, sendTelemetry } from "../../../api";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import type { PublishSession, TelemetryPayload } from "../../../types";
import type { PublisherGateway } from "../contracts/publisherGateway";

export class HttpPublisherGateway implements PublisherGateway {
  constructor(private readonly fetcher: typeof fetch) {}

  create(identity: AuthenticatedAccount, sensorId?: string): Promise<PublishSession> {
    return createPublishSession(identity, this.fetcher, sensorId);
  }

  end(session: PublishSession): Promise<void> {
    return endPublishSession(session, this.fetcher);
  }

  renew(session: PublishSession): Promise<PublishSession> {
    return renewPublishSession(session, this.fetcher);
  }

  sendTelemetry(payload: TelemetryPayload, identity: AuthenticatedAccount): Promise<void> {
    return sendTelemetry(payload, identity, this.fetcher);
  }
}
