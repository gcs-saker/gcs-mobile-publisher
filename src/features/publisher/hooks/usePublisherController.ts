import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntime } from "../../../app/RuntimeProvider";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import { buildTelemetryPayload } from "../../../sensors";
import { useAdaptiveQuality } from "../../../useAdaptiveQuality";
import { useDeviceSensors } from "../../../useDeviceSensors";
import { usePwaInstall } from "../../../usePwaInstall";
import { createWhipSession } from "../../../whip";
import {
  usePublisherStore,
  usePublisherStoreApi,
  usePublisherGateway,
} from "../application/PublisherStoreProvider";
import { ReconnectScheduler } from "../application/ReconnectScheduler";
import { ReconnectPolicy } from "../domain/reconnectPolicy";
import {
  transitionPublisher,
  type PublisherEvent,
  type PublisherTransition,
} from "../domain/publisherMachine";
import type { PublishSession } from "../../../types";

export function usePublisherController(identity: AuthenticatedAccount | null) {
  const runtime = useRuntime();
  const gateway = usePublisherGateway();
  const store = usePublisherStoreApi();
  const state = usePublisherStore((snapshot) => snapshot);
  const { isOnline, mediaReady, message, muted, quality, status, streamId } = state;
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const publishSessionRef = useRef<PublishSession | null>(null);
  const renewalTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const publishingRef = useRef(false);
  const publishRef = useRef<() => Promise<void>>(async () => undefined);
  const startedAtRef = useRef(0);
  const reconnectSchedulerRef = useRef<ReconnectScheduler | null>(null);
  reconnectSchedulerRef.current ??= new ReconnectScheduler(
    runtime.scheduler,
    new ReconnectPolicy(
      {
        baseDelayMs: 1_000,
        jitterRatio: 0.2,
        maxAttempts: 5,
        maxDelayMs: 10_000,
      },
      runtime.random,
    ),
  );
  const reconnectScheduler = reconnectSchedulerRef.current;
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

  const scheduleReconnect = useCallback((activeGeneration: number) => {
    if (!runtime.network.online || !mediaRef.current) return;
    const result = reconnectScheduler.schedule(() => {
      if (runtime.network.online && mediaRef.current) void publishRef.current();
    });
    if (result.outcome === "scheduled") {
      store.setState({
        message: `네트워크 연결을 복구합니다. ${result.schedule.attempt}/5`,
      });
      return;
    }
    if (result.outcome === "exhausted") {
      const failure = dispatch({ type: "FAILED", generation: activeGeneration });
      if (failure.accepted) {
        store.setState({ message: "자동 재연결 횟수를 초과했습니다. 다시 준비해 주세요." });
      }
    }
  }, [dispatch, reconnectScheduler, runtime.network, store]);

  const prepare = useCallback(async () => {
    const requested = dispatch({ type: "PREPARE_REQUESTED" });
    if (!requested.accepted) return;
    const activeGeneration = requested.state.generation;
    try {
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
  }, [dispatch, runtime, startSensors, store]);

  const publish = useCallback(async () => {
    if (!mediaRef.current || publishingRef.current || !identity) return;
    publishingRef.current = true;
    const activeGeneration = store.getSnapshot().generation;
    const wasReconnecting = store.getSnapshot().status === "reconnecting";
    const requested = wasReconnecting
      ? dispatch({ type: "RETRY_REQUESTED", generation: activeGeneration })
      : dispatch({ type: "PUBLISH_REQUESTED", generation: activeGeneration });
    if (!requested.accepted) {
      publishingRef.current = false;
      return;
    }
    try {
      const previousSession = publishSessionRef.current;
      if (previousSession) {
        publishSessionRef.current = null;
        await gateway.end(previousSession).catch(() => undefined);
      }
      const authorization = await gateway.create(identity);
      publishSessionRef.current = authorization;
      store.setState({ streamId: authorization.streamId });
      const authorized = dispatch({ type: "AUTHORIZED", generation: activeGeneration });
      if (!authorized.accepted) return;
      peerConnectionRef.current?.close();
      const connection = await createWhipSession(
        mediaRef.current,
        authorization.publishUrl,
        authorization.iceServers,
        authorization.publishToken,
        (state) => {
          if (state !== "disconnected" && state !== "failed") return;
          const lost = dispatch({ type: "CONNECTION_LOST", generation: activeGeneration });
          if (!lost.accepted) return;
          scheduleReconnect(activeGeneration);
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
      reconnectScheduler.reset();
      store.setState({ message: "영상과 현장 센서를 송출하고 있습니다." });
    } catch (reason) {
      if (mediaRef.current && (wasReconnecting || !runtime.network.online)) {
        const lost = dispatch({ type: "CONNECTION_LOST", generation: activeGeneration });
        if (lost.accepted) {
          store.setState({ message: "네트워크 연결을 기다리고 있습니다." });
          scheduleReconnect(activeGeneration);
        }
      } else {
        const failure = dispatch({ type: "FAILED", generation: activeGeneration });
        if (failure.accepted) {
          store.setState({
            message: reason instanceof Error ? reason.message : "송출을 시작하지 못했습니다.",
          });
        }
      }
    } finally {
      publishingRef.current = false;
    }
  }, [dispatch, gateway, identity, reconnectScheduler, runtime, scheduleReconnect, store]);

  const stop = useCallback(() => {
    dispatch({ type: "STOPPED" });
    reconnectScheduler.reset();
    publishingRef.current = false;
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
    const activeSession = publishSessionRef.current;
    publishSessionRef.current = null;
    if (renewalTimerRef.current !== null) runtime.scheduler.clearInterval(renewalTimerRef.current);
    renewalTimerRef.current = null;
    if (activeSession) void gateway.end(activeSession).catch(() => undefined);
    store.setState({ message: "송출을 종료했습니다." });
  }, [dispatch, gateway, reconnectScheduler, runtime.scheduler, stopSensors, store]);

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
      const current = store.getSnapshot();
      if (mediaRef.current && current.status === "reconnecting") {
        store.setState({ message: "네트워크가 복구되어 송출을 다시 연결합니다." });
        scheduleReconnect(current.generation);
      }
    },
    () => {
      store.setState({ isOnline: false });
      reconnectScheduler.cancel();
      if (mediaRef.current) {
        const current = store.getSnapshot();
        const lost = dispatch({ type: "CONNECTION_LOST", generation: current.generation });
        if (lost.accepted) {
          store.setState({ message: "네트워크가 끊겼습니다. 연결 복구를 기다립니다." });
        }
      }
    },
  ), [dispatch, reconnectScheduler, runtime.network, scheduleReconnect, store]);

  useEffect(() => {
    if (status !== "live" || !identity) return;
    renewalTimerRef.current = runtime.scheduler.setInterval(() => {
      const session = publishSessionRef.current;
      if (!session) return;
      void gateway.renew(session).then(
        (renewed) => { publishSessionRef.current = renewed; },
        (reason: unknown) => {
          store.setState({ message: reason instanceof Error ? reason.message : "송출 세션 갱신 오류" });
        },
      );
    }, 120_000);
    const id = runtime.scheduler.setInterval(() => {
      void gateway.sendTelemetry(
        buildTelemetryPayload(
          store.getSnapshot().streamId,
          startedAtRef.current,
          snapshot,
          runtime.clock,
          runtime.userAgent,
        ),
        identity,
      ).catch((reason: unknown) => {
        store.setState({
          message: reason instanceof Error ? reason.message : "센서 전송 오류",
        });
      });
    }, 2_000);
    return () => {
      runtime.scheduler.clearInterval(id);
      if (renewalTimerRef.current !== null) runtime.scheduler.clearInterval(renewalTimerRef.current);
      renewalTimerRef.current = null;
    };
  }, [gateway, identity, runtime, snapshot, status, store]);

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
    toggleMute,
    videoRef,
  } as const;
}
