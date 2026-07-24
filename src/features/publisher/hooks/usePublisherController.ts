import { useCallback, useEffect, useRef, useState } from "react";
import { authorizePublish, sendTelemetry } from "../../../api";
import { useRuntime } from "../../../app/RuntimeProvider";
import { buildTelemetryPayload } from "../../../sensors";
import { useAdaptiveQuality } from "../../../useAdaptiveQuality";
import { useDeviceSensors } from "../../../useDeviceSensors";
import { usePwaInstall } from "../../../usePwaInstall";
import { createWhipSession } from "../../../whip";
import {
  usePublisherStore,
  usePublisherStoreApi,
} from "../application/PublisherStoreProvider";
import {
  transitionPublisher,
  type PublisherEvent,
  type PublisherTransition,
} from "../domain/publisherMachine";

export function usePublisherController() {
  const runtime = useRuntime();
  const store = usePublisherStoreApi();
  const state = usePublisherStore((snapshot) => snapshot);
  const { generation, isOnline, mediaReady, message, muted, quality, status, streamId, token } = state;
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const publishRef = useRef<() => Promise<void>>(async () => undefined);
  const startedAtRef = useRef(0);
  const {
    snapshot,
    error: sensorError,
    start: startSensors,
    stop: stopSensors,
  } = useDeviceSensors(runtime);
  const adaptiveQuality = useAdaptiveQuality(peerConnection, media, status === "live", runtime.scheduler);
  const pwa = usePwaInstall();
  const dispatch = useCallback((event: PublisherEvent): PublisherTransition => {
    const current = store.getSnapshot();
    const result = transitionPublisher(
      { generation: current.generation, status: current.status },
      event,
    );
    if (result.accepted) {
      store.setState({
        generation: result.state.generation,
        status: result.state.status,
      });
    }
    return result;
  }, [store]);

  const prepare = useCallback(async () => {
    const requested = dispatch({ type: "PREPARE_REQUESTED" });
    if (!requested.accepted) return;
    const activeGeneration = requested.state.generation;
    try {
      if (token.trim()) runtime.sessionStore.set("gcs.accessToken", token.trim());
      else runtime.sessionStore.remove("gcs.accessToken");
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      if (!runtime.mediaDevices) throw new Error("이 기기에서는 카메라를 사용할 수 없습니다.");
      const nextMedia = await runtime.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const preview = dispatch({ type: "PREVIEW_READY", generation: activeGeneration });
      if (!preview.accepted) {
        nextMedia.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaRef.current = nextMedia;
      setMedia(nextMedia);
      store.setState({ mediaReady: true });
      if (videoRef.current) videoRef.current.srcObject = nextMedia;
      await startSensors();
      wakeLockRef.current = await runtime.wakeLock.request();
      store.setState({ message: "후면 카메라와 센서가 준비됐습니다." });
    } catch (reason) {
      const failure = dispatch({ type: "FAILED", generation: activeGeneration });
      if (!failure.accepted) return;
      store.setState({
        message: reason instanceof Error ? reason.message : "기기 권한을 받을 수 없습니다.",
      });
    }
  }, [dispatch, runtime, startSensors, store, token]);

  const publish = useCallback(async () => {
    if (!mediaRef.current) return;
    const activeGeneration = store.getSnapshot().generation;
    const requested = status === "reconnecting"
      ? dispatch({ type: "RETRY_REQUESTED", generation: activeGeneration })
      : dispatch({ type: "PUBLISH_REQUESTED", generation: activeGeneration });
    if (!requested.accepted) return;
    try {
      const authorization = await authorizePublish(streamId.trim(), token.trim(), runtime.fetch);
      const authorized = dispatch({ type: "AUTHORIZED", generation: activeGeneration });
      if (!authorized.accepted) return;
      peerConnectionRef.current?.close();
      const connection = await createWhipSession(
        mediaRef.current,
        authorization.whipUrl,
        authorization.iceServers,
        (state) => {
          if (state !== "disconnected" && state !== "failed") return;
          const lost = dispatch({ type: "CONNECTION_LOST", generation: activeGeneration });
          if (!lost.accepted) return;
          store.setState({ message: "네트워크 연결을 복구하고 있습니다." });
          if (reconnectTimerRef.current !== null) return;
          const delay = Math.min(15_000, 1_000 * 2 ** reconnectAttemptRef.current);
          reconnectAttemptRef.current += 1;
          reconnectTimerRef.current = runtime.scheduler.setTimeout(() => {
            reconnectTimerRef.current = null;
            if (runtime.network.online && mediaRef.current) void publishRef.current();
          }, delay);
        },
        runtime.fetch,
        runtime.peerConnections,
        runtime.scheduler,
      );
      const connected = dispatch({ type: "CONNECTED", generation: activeGeneration });
      if (!connected.accepted) {
        connection.close();
        return;
      }
      peerConnectionRef.current = connection;
      setPeerConnection(connection);
      startedAtRef.current = runtime.clock.now();
      reconnectAttemptRef.current = 0;
      store.setState({ message: "영상과 현장 센서를 송출하고 있습니다." });
    } catch (reason) {
      if (mediaRef.current && !runtime.network.online) {
        const lost = dispatch({ type: "CONNECTION_LOST", generation: activeGeneration });
        if (lost.accepted) {
          store.setState({ message: "네트워크 연결을 기다리고 있습니다." });
        }
      } else {
        const failure = dispatch({ type: "FAILED", generation: activeGeneration });
        if (failure.accepted) {
          store.setState({
            message: reason instanceof Error ? reason.message : "송출을 시작하지 못했습니다.",
          });
        }
      }
    }
  }, [dispatch, runtime, status, store, streamId, token]);

  const stop = useCallback(() => {
    dispatch({ type: "STOPPED" });
    if (reconnectTimerRef.current !== null) {
      runtime.scheduler.clearTimeout(reconnectTimerRef.current);
    }
    reconnectTimerRef.current = null;
    reconnectAttemptRef.current = 0;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setPeerConnection(null);
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    setMedia(null);
    store.setState({ mediaReady: false });
    if (videoRef.current) videoRef.current.srcObject = null;
    stopSensors();
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    store.setState({ message: "송출을 종료했습니다." });
  }, [dispatch, runtime.scheduler, stopSensors, store]);

  const toggleMute = useCallback(() => {
    const nextMuted = !store.getSnapshot().muted;
    mediaRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    store.setState({ muted: nextMuted });
  }, [store]);

  useEffect(() => {
    store.setState({ quality: adaptiveQuality });
  }, [adaptiveQuality, store]);

  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  useEffect(() => runtime.network.subscribe(
    () => {
      store.setState({ isOnline: true });
      if (mediaRef.current && (status === "reconnecting" || status === "error")) {
        store.setState({ message: "네트워크가 복구되어 송출을 다시 연결합니다." });
        void publishRef.current();
      }
    },
    () => {
      store.setState({ isOnline: false });
      if (mediaRef.current) {
        const lost = dispatch({ type: "CONNECTION_LOST", generation });
        if (lost.accepted) {
          store.setState({ message: "네트워크가 끊겼습니다. 연결 복구를 기다립니다." });
        }
      }
    },
  ), [dispatch, generation, runtime.network, status, store]);

  useEffect(() => {
    if (status !== "live") return;
    const id = runtime.scheduler.setInterval(() => {
      void sendTelemetry(
        buildTelemetryPayload(
          streamId,
          startedAtRef.current,
          snapshot,
          runtime.clock,
          runtime.userAgent,
        ),
        token,
        runtime.fetch,
      ).catch((reason: unknown) => {
        store.setState({
          message: reason instanceof Error ? reason.message : "센서 전송 오류",
        });
      });
    }, 2_000);
    return () => runtime.scheduler.clearInterval(id);
  }, [runtime, snapshot, status, store, streamId, token]);

  useEffect(() => stop, [stop]);

  return {
    canInstall: pwa.canInstall,
    install: pwa.install,
    isInstalled: pwa.isInstalled,
    isOnline,
    mediaReady,
    message,
    muted,
    prepare,
    publish,
    quality,
    sensorError,
    snapshot,
    status,
    stop,
    streamId,
    setStreamId: (value: string) => store.setState({ streamId: value }),
    token,
    setToken: (value: string) => store.setState({ token: value }),
    toggleMute,
    videoRef,
  } as const;
}
