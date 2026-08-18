import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntime } from "../../../app/RuntimeProvider";
import { useAdaptiveQuality } from "../../../useAdaptiveQuality";
import { useDeviceSensors } from "../../../useDeviceSensors";
import { usePwaInstall } from "../../../usePwaInstall";
import { createWhipSession } from "../../../whip";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import { PublisherConnectionCoordinator } from "../application/PublisherConnectionCoordinator";
import { ReconnectScheduler } from "../application/ReconnectScheduler";
import {
  usePublisherGateway, usePublisherStore, usePublisherStoreApi,
} from "../application/PublisherStoreProvider";
import { ReconnectPolicy } from "../domain/reconnectPolicy";
import { MediaCaptureController } from "../infrastructure/MediaCaptureController";
import { WakeLockController } from "../infrastructure/WakeLockController";
import { usePublisherRuntimeEffects } from "./usePublisherRuntimeEffects";
import { usePublisherTransition } from "./usePublisherTransition";
import type { CameraFacingMode, CoordinatePrecision } from "../domain/publisherSettings";

export function usePublisherController(identity: AuthenticatedAccount | null) {
  const runtime = useRuntime();
  const gateway = usePublisherGateway();
  const store = usePublisherStoreApi();
  const state = usePublisherStore((snapshot) => snapshot);
  const { cameraFacingMode, coordinatePrecision, isOnline, mediaReady, message, muted, quality, status, streamId } = state;
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const publishRef = useRef<() => Promise<void>>(async () => undefined);
  const renewalTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const mediaControllerRef = useRef<MediaCaptureController | null>(null);
  mediaControllerRef.current ??= new MediaCaptureController();
  const mediaController = mediaControllerRef.current;
  const connectionRef = useRef<PublisherConnectionCoordinator | null>(null);
  connectionRef.current ??= new PublisherConnectionCoordinator();
  const connectionCoordinator = connectionRef.current;
  const wakeLockRef = useRef<WakeLockController | null>(null);
  wakeLockRef.current ??= new WakeLockController();
  const wakeLockController = wakeLockRef.current;
  const reconnectRef = useRef<ReconnectScheduler | null>(null);
  reconnectRef.current ??= new ReconnectScheduler(
    runtime.scheduler,
    new ReconnectPolicy({
      baseDelayMs: 1_000, jitterRatio: 0.2, maxAttempts: 5, maxDelayMs: 10_000,
    }, runtime.random),
  );
  const reconnectScheduler = reconnectRef.current;
  const { snapshot, error: sensorError, start: startSensors, stop: stopSensors } = useDeviceSensors(runtime);
  const adaptiveQuality = useAdaptiveQuality(peerConnection, media, status === "live", runtime.scheduler);
  const pwa = usePwaInstall();
  const dispatch = usePublisherTransition(store);

  const scheduleReconnect = useCallback((generation: number) => {
    if (!runtime.network.online || !mediaController.stream) return;
    const result = reconnectScheduler.schedule(() => {
      if (runtime.network.online && mediaController.stream) void publishRef.current();
    });
    if (result.outcome === "scheduled") {
      store.setState({ message: `네트워크 연결을 복구합니다. ${result.schedule.attempt}/5` });
    } else if (result.outcome === "exhausted") {
      const failure = dispatch({ type: "FAILED", generation });
      if (failure.accepted) store.setState({ message: "자동 재연결 횟수를 초과했습니다. 다시 준비해 주세요." });
    }
  }, [dispatch, mediaController, reconnectScheduler, runtime.network, store]);

  const prepare = useCallback(async () => {
    const requested = dispatch({ type: "PREPARE_REQUESTED" });
    if (!requested.accepted) return;
    const generation = requested.state.generation;
    try {
      const nextMedia = await mediaController.capture(runtime.mediaDevices, cameraFacingMode);
      setMedia(nextMedia);
      store.setState({ mediaReady: true });
      mediaController.attach(videoRef.current);
      await startSensors();
      await wakeLockController.acquire(runtime.wakeLock);
      const preview = dispatch({ type: "PREVIEW_READY", generation });
      if (!preview.accepted) {
        mediaController.stop(videoRef.current);
        setMedia(null);
        stopSensors();
        void wakeLockController.release();
        store.setState({ mediaReady: false });
        return;
      }
      store.setState({ message: "후면 카메라와 센서가 준비되었습니다." });
    } catch (reason) {
      mediaController.stop(videoRef.current);
      setMedia(null);
      stopSensors();
      void wakeLockController.release();
      store.setState({ mediaReady: false });
      const failure = dispatch({ type: "FAILED", generation });
      if (failure.accepted) store.setState({
        message: reason instanceof Error ? reason.message : "장치 권한을 받을 수 없습니다.",
      });
    }
  }, [cameraFacingMode, dispatch, mediaController, runtime, startSensors, stopSensors, store, wakeLockController]);

  const setCameraFacingMode = useCallback(async (value: CameraFacingMode) => {
    const current = store.getSnapshot();
    if (current.cameraFacingMode === value) return;
    if (current.status === "idle" || current.status === "error") {
      store.setState({ cameraFacingMode: value });
      return;
    }
    if (current.status !== "live" || !peerConnection) return;
    const sender = peerConnection.getSenders().find((candidate) => candidate.track?.kind === "video");
    if (!sender) {
      store.setState({ message: "활성 영상 송신기를 찾을 수 없습니다." });
      return;
    }
    store.setState({ message: "카메라를 전환하고 있습니다." });
    try {
      await mediaController.switchCamera(runtime.mediaDevices, value, (track) => sender.replaceTrack(track));
      mediaController.attach(videoRef.current);
      store.setState({ cameraFacingMode: value, message: "카메라를 전환했습니다." });
    } catch (reason: unknown) {
      store.setState({ message: reason instanceof Error ? reason.message : "카메라 전환에 실패했습니다." });
    }
  }, [mediaController, peerConnection, runtime.mediaDevices, store]);

  const setCoordinatePrecision = useCallback((value: CoordinatePrecision) => {
    store.setState({ coordinatePrecision: value });
  }, [store]);

  const publish = useCallback(async () => {
    const activeMedia = mediaController.stream;
    if (!activeMedia || !identity || !connectionCoordinator.beginPublishing()) return;
    const generation = store.getSnapshot().generation;
    const reconnecting = store.getSnapshot().status === "reconnecting";
    const requested = reconnecting
      ? dispatch({ type: "RETRY_REQUESTED", generation })
      : dispatch({ type: "PUBLISH_REQUESTED", generation });
    if (!requested.accepted) {
      connectionCoordinator.finishPublishing();
      return;
    }
    try {
      const previous = connectionCoordinator.replaceSession(null);
      if (previous) await gateway.end(previous).catch(() => undefined);
      const authorization = await gateway.create(identity);
      if (!dispatch({ type: "AUTHORIZED", generation }).accepted) {
        await gateway.end(authorization).catch(() => undefined);
        return;
      }
      connectionCoordinator.replaceSession(authorization);
      store.setState({ streamId: authorization.streamId });
      connectionCoordinator.replaceConnection(null);
      const connection = await createWhipSession(
        activeMedia, authorization.publishUrl, authorization.iceServers, authorization.publishToken,
        (connectionState) => {
          if (connectionState !== "disconnected" && connectionState !== "failed") return;
          if (dispatch({ type: "CONNECTION_LOST", generation }).accepted) scheduleReconnect(generation);
        },
        runtime.fetch, runtime.peerConnections, runtime.scheduler,
      );
      if (!dispatch({ type: "CONNECTED", generation }).accepted) {
        connection.close();
        return;
      }
      connectionCoordinator.replaceConnection(connection);
      setPeerConnection(connection);
      startedAtRef.current = runtime.clock.now();
      reconnectScheduler.reset();
      store.setState({ message: "영상과 현장 센서를 송출하고 있습니다." });
    } catch (reason) {
      if (mediaController.stream && (reconnecting || !runtime.network.online)) {
        if (dispatch({ type: "CONNECTION_LOST", generation }).accepted) {
          store.setState({ message: "네트워크 연결을 기다리고 있습니다." });
          scheduleReconnect(generation);
        }
      } else if (dispatch({ type: "FAILED", generation }).accepted) {
        store.setState({ message: reason instanceof Error ? reason.message : "송출을 시작하지 못했습니다." });
      }
    } finally {
      connectionCoordinator.finishPublishing();
    }
  }, [connectionCoordinator, dispatch, gateway, identity, mediaController, reconnectScheduler, runtime, scheduleReconnect, store]);

  const stop = useCallback(() => {
    dispatch({ type: "STOPPED" });
    reconnectScheduler.reset();
    void connectionCoordinator.release(gateway);
    setPeerConnection(null);
    mediaController.stop(videoRef.current);
    setMedia(null);
    store.setState({ mediaReady: false, message: "송출을 종료했습니다." });
    stopSensors();
    void wakeLockController.release();
    if (renewalTimerRef.current !== null) runtime.scheduler.clearInterval(renewalTimerRef.current);
    renewalTimerRef.current = null;
  }, [connectionCoordinator, dispatch, gateway, mediaController, reconnectScheduler, runtime.scheduler, stopSensors, store, wakeLockController]);

  const toggleMute = useCallback(() => {
    const nextMuted = !store.getSnapshot().muted;
    mediaController.setMuted(nextMuted);
    store.setState({ muted: nextMuted });
  }, [mediaController, store]);

  useEffect(() => { store.setState({ quality: adaptiveQuality }); }, [adaptiveQuality, store]);
  useEffect(() => { publishRef.current = publish; }, [publish]);
  usePublisherRuntimeEffects({
    connectionCoordinator, dispatch, gateway, identity, mediaController, reconnectScheduler,
    renewalTimerRef, runtime, scheduleReconnect, sensorSnapshot: snapshot, startedAtRef, status, store,
    wakeLockController,
  });
  useEffect(() => stop, [stop]);

  return {
    cameraFacingMode, canInstall: pwa.canInstall, coordinatePrecision, install: pwa.install, isInstalled: pwa.isInstalled,
    isOnline, mediaReady, message, muted, prepare, publish, quality, sensorError,
    setCameraFacingMode, setCoordinatePrecision, snapshot, status, stop, streamId, toggleMute, videoRef,
  } as const;
}
