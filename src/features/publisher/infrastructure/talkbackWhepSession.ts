import type { PeerConnectionFactory, Scheduler } from "../../../app/ports";

const ICE_GATHERING_TIMEOUT_MS = 8_000;

interface TalkbackWhepSessionInput {
  audio: HTMLAudioElement | null;
  fetcher: typeof fetch;
  iceServers: RTCIceServer[];
  onPlaybackState: (status: string) => void;
  peerConnections: PeerConnectionFactory;
  scheduler: Scheduler;
  url: string;
}

export async function createTalkbackWhepSession(
  input: TalkbackWhepSessionInput,
): Promise<RTCPeerConnection> {
  const connection = input.peerConnections.create({ iceServers: input.iceServers });
  try {
    connection.addTransceiver("audio", { direction: "recvonly" });
    connection.ontrack = (event) => attachTalkbackAudio(input, event);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await waitForIceGathering(connection, input.scheduler);
    const sdp = connection.localDescription?.sdp;
    if (!sdp) throw new Error("관제 음성 WHEP offer를 생성하지 못했습니다.");
    const response = await input.fetcher(input.url, {
      body: sdp,
      headers: { Accept: "application/sdp", "Content-Type": "application/sdp" },
      method: "POST",
    });
    if (!response.ok) throw new Error(`관제 음성 WHEP 연결 실패 (${response.status})`);
    await connection.setRemoteDescription({ type: "answer", sdp: await response.text() });
    return connection;
  } catch (error: unknown) {
    connection.close();
    throw error;
  }
}

function waitForIceGathering(connection: RTCPeerConnection, scheduler: Scheduler): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeoutId = scheduler.setTimeout(done, ICE_GATHERING_TIMEOUT_MS);
    function done(): void {
      scheduler.clearTimeout(timeoutId);
      connection.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    function onChange(): void {
      if (connection.iceGatheringState === "complete") done();
    }
    connection.addEventListener("icegatheringstatechange", onChange);
  });
}

function attachTalkbackAudio(input: TalkbackWhepSessionInput, event: RTCTrackEvent): void {
  if (!input.audio) return;
  input.audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
  void input.audio.play().then(
    () => input.onPlaybackState("관제 음성 수신 중"),
    () => input.onPlaybackState("음성 재생 허용 필요"),
  );
}
