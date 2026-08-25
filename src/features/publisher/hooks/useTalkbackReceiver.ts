import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTalkbackPlaybackUrl } from "../../../api";
import type { RuntimeDependencies } from "../../../app/ports";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";

const TALKBACK_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 10_000] as const;

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
  const connect = async (attempt: number): Promise<void> => {
    try {
      setStatus("관제 음성 연결 중");
      const url = await fetchTalkbackPlaybackUrl(input.identity!, input.streamId, input.runtime.fetch);
      connection = input.runtime.peerConnections.create({});
      connection.addTransceiver("audio", { direction: "recvonly" });
      connection.ontrack = (event) => attachTalkbackAudio(audioRef.current, event);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      if (!offer.sdp) throw new Error("관제 음성 WHEP offer를 생성하지 못했습니다.");
      const response = await input.runtime.fetch(url, {
        body: offer.sdp, headers: { "Content-Type": "application/sdp" }, method: "POST",
      });
      if (!response.ok) throw new Error(`관제 음성 WHEP 연결 실패 (${response.status})`);
      await connection.setRemoteDescription({ type: "answer", sdp: await response.text() });
      if (!disposed) setStatus("관제 음성 수신 중");
    } catch (error) {
      connection?.close();
      connection = null;
      if (disposed || attempt >= TALKBACK_RETRY_DELAYS_MS.length) {
        if (!disposed) setStatus(error instanceof Error ? error.message : "관제 음성 연결 실패");
        return;
      }
      retryTimer = input.runtime.scheduler.setTimeout(
        () => void connect(attempt + 1),
        TALKBACK_RETRY_DELAYS_MS[attempt] ?? 10_000,
      );
    }
  };
  void connect(0);
  return () => {
    disposed = true;
    if (retryTimer !== null) input.runtime.scheduler.clearTimeout(retryTimer);
    connection?.close();
    if (audioRef.current) audioRef.current.srcObject = null;
  };
}

function attachTalkbackAudio(audio: HTMLAudioElement | null, event: RTCTrackEvent): void {
  if (!audio) return;
  audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
}
