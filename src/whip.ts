import type { PeerConnectionFactory, Scheduler } from "./app/ports";

const ICE_TIMEOUT_MS = 8_000;
const CONNECT_TIMEOUT_MS = 15_000;

function waitForIce(pc: RTCPeerConnection, scheduler: Scheduler): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = scheduler.setTimeout(done, ICE_TIMEOUT_MS);
    function done(): void {
      scheduler.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", change);
      resolve();
    }
    function change(): void {
      if (pc.iceGatheringState === "complete") done();
    }
    pc.addEventListener("icegatheringstatechange", change);
  });
}

function waitForConnection(pc: RTCPeerConnection, scheduler: Scheduler): Promise<void> {
  if (pc.connectionState === "connected") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = scheduler.setTimeout(
      () => finish(new Error("WebRTC 연결 시간이 초과됐습니다.")),
      CONNECT_TIMEOUT_MS,
    );
    function finish(error?: Error): void {
      scheduler.clearTimeout(timeout);
      pc.removeEventListener("connectionstatechange", change);
      if (error) reject(error);
      else resolve();
    }
    function change(): void {
      if (pc.connectionState === "connected") finish();
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        finish(new Error(`WebRTC 연결 실패 (${pc.connectionState})`));
      }
    }
    pc.addEventListener("connectionstatechange", change);
  });
}

export async function createWhipSession(
  media: MediaStream,
  whipUrl: string,
  iceServers: RTCIceServer[],
  onConnectionChange: (state: RTCPeerConnectionState) => void,
  fetcher: typeof fetch,
  peerConnections: PeerConnectionFactory,
  scheduler: Scheduler,
): Promise<RTCPeerConnection> {
  const pc = peerConnections.create({ iceServers });
  pc.addEventListener("connectionstatechange", () => onConnectionChange(pc.connectionState));
  media.getTracks().forEach((track) => pc.addTrack(track, media));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc, scheduler);
  if (!pc.localDescription?.sdp) throw new Error("WebRTC SDP 생성에 실패했습니다.");
  const response = await fetcher(whipUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp", Accept: "application/sdp" },
    body: pc.localDescription.sdp,
  });
  if (!response.ok) {
    pc.close();
    throw new Error(`WHIP 연결 실패 (${response.status})`);
  }
  await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
  await waitForConnection(pc, scheduler);
  return pc;
}
