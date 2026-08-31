import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTalkbackPlaybackUrl } from "../../../api";
import type { RuntimeDependencies } from "../../../app/ports";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import { talkbackRetryDelayMs } from "../domain/talkbackRetryPolicy";


export function useTalkbackReceiver(input: {
  active: boolean;
  identity: AuthenticatedAccount | null;
  runtime: RuntimeDependencies;
  streamId: string;
}) {
  const { active, identity, runtime, streamId } = input;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState("대기");
  const session = useMemo(() => ({ active, identity, runtime, streamId }), [active, identity, runtime, streamId]);
  useEffect(() => startTalkbackReceiver(session, audioRef, setStatus), [session]);
  return { audioRef, status } as const;
}

function startTalkbackReceiver(
  input: { active: boolean; identity: AuthenticatedAccount | null; runtime: RuntimeDependencies; streamId: string },
  audioRef: { current: HTMLAudioElement | null },
  setStatus: (status: string) => void,
): (() => void) | undefined {
  if (!input.active || !input.identity || !input.streamId) return undefined;
  let disposed = false;
  let connection: RTCPeerConnection | null = null;
  let retryTimer: number | null = null;
  let connecting = false;
  const scheduleRetry = (): void => {
    if (disposed || retryTimer !== null) return;
    const retryDelayMs = talkbackRetryDelayMs(input.active);
    if (retryDelayMs === null) return;
    setStatus("대기");
    retryTimer = input.runtime.scheduler.setTimeout(() => {
      retryTimer = null;
      void connect();
    }, retryDelayMs);
  };
  const closeConnection = (): void => {
    if (!connection) return;
    connection.onconnectionstatechange = null;
    connection.ontrack = null;
    connection.close();
    connection = null;
  };
  const connect = async (): Promise<void> => {
    if (disposed || connecting || connection) return;
    connecting = true;
    try {
      setStatus("관제 음성 연결 중");
      const url = await fetchTalkbackPlaybackUrl(input.identity!, input.streamId, input.runtime.fetch);
      connection = input.runtime.peerConnections.create({});
      connection.addTransceiver("audio", { direction: "recvonly" });
      connection.ontrack = (event) => {
        attachTalkbackAudio(audioRef.current, event);
        if (!disposed) setStatus("관제 음성 수신 중");
      };
      connection.onconnectionstatechange = () => {
        if (!connection) return;
        if (connection.connectionState === "failed" || connection.connectionState === "closed") {
          closeConnection();
          scheduleRetry();
        }
      };
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      if (!offer.sdp) throw new Error("관제 음성 WHEP offer를 생성하지 못했습니다.");
      const response = await input.runtime.fetch(url, {
        body: offer.sdp, headers: { "Content-Type": "application/sdp" }, method: "POST",
      });
      if (!response.ok) throw new Error(`관제 음성 WHEP 연결 실패 (${response.status})`);
      await connection.setRemoteDescription({ type: "answer", sdp: await response.text() });
    } catch {
      closeConnection();
      scheduleRetry();
    } finally {
      connecting = false;
    }
  };
  void connect();
  return () => {
    disposed = true;
    if (retryTimer !== null) input.runtime.scheduler.clearTimeout(retryTimer);
    closeConnection();
    if (audioRef.current) audioRef.current.srcObject = null;
  };
}

function attachTalkbackAudio(audio: HTMLAudioElement | null, event: RTCTrackEvent): void {
  if (!audio) return;
  audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
  void audio.play().catch(() => undefined);
}
