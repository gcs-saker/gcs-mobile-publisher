import type { PublishSession } from "../../../types";
import type { PublisherGateway } from "../contracts/publisherGateway";

export class PublisherConnectionCoordinator {
  private activeConnection: RTCPeerConnection | null = null;
  private activeSession: PublishSession | null = null;
  private publishing = false;

  get connection(): RTCPeerConnection | null {
    return this.activeConnection;
  }

  get session(): PublishSession | null {
    return this.activeSession;
  }

  beginPublishing(): boolean {
    if (this.publishing) return false;
    this.publishing = true;
    return true;
  }

  finishPublishing(): void {
    this.publishing = false;
  }

  replaceConnection(connection: RTCPeerConnection | null): void {
    this.activeConnection?.close();
    this.activeConnection = connection;
  }

  replaceSession(session: PublishSession | null): PublishSession | null {
    const previous = this.activeSession;
    this.activeSession = session;
    return previous;
  }

  async release(gateway: PublisherGateway): Promise<void> {
    this.finishPublishing();
    this.replaceConnection(null);
    const session = this.replaceSession(null);
    if (session) await gateway.end(session).catch(() => undefined);
  }
}
