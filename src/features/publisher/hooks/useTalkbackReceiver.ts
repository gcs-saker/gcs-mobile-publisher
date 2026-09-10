import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTalkbackPlaybackUrl } from "../../../api";
import type { RuntimeDependencies } from "../../../app/ports";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import { talkbackRetryDelayMs } from "../domain/talkbackRetryPolicy";
import { createTalkbackWhepSession } from "../infrastructure/talkbackWhepSession";


export function useTalkbackReceiver(input: {
  active: boolean;
  iceServers: RTCIceServer[];
  identity: AuthenticatedAccount | null;
  runtime: RuntimeDependencies;
  streamId: string;
}) {
  const { active, iceServers, identity, runtime, streamId } = input;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState("대기");
  const session = useMemo(
    () => ({ active, iceServers, identity, runtime, streamId }),
    [active, iceServers, identity, runtime, streamId],
  );
  useEffect(() => startTalkbackReceiver(session, audioRef, setStatus), [session]);
  const resumePlayback = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setStatus("관제 음성 수신 중");
    } catch {
      setStatus("음성 재생 허용 필요");
    }
  }, []);
  return { audioRef, resumePlayback, status } as const;
}

function startTalkbackReceiver(
  input: {
    active: boolean; iceServers: RTCIceServer[]; identity: AuthenticatedAccount | null;
    runtime: RuntimeDependencies; streamId: string;
  },
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
      connection = await createTalkbackWhepSession({
        audio: audioRef.current, fetcher: input.runtime.fetch, iceServers: input.iceServers,
        onPlaybackState: (nextStatus) => { if (!disposed) setStatus(nextStatus); },
        peerConnections: input.runtime.peerConnections, scheduler: input.runtime.scheduler, url,
      });
      if (disposed) {
        closeConnection();
        return;
      }
      connection.onconnectionstatechange = () => {
        if (!connection) return;
        if (connection.connectionState === "failed" || connection.connectionState === "closed") {
          closeConnection();
          scheduleRetry();
        }
      };
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
