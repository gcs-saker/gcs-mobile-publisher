import { useCallback, useEffect, useRef, useState } from "react";
import { authorizePublish, sendTelemetry } from "../../../api";
import { useRuntime } from "../../../app/RuntimeProvider";
import { config } from "../../../config";
import { buildTelemetryPayload } from "../../../sensors";
import type { PublisherStatus } from "../../../types";
import { useAdaptiveQuality } from "../../../useAdaptiveQuality";
import { useDeviceSensors } from "../../../useDeviceSensors";
import { usePwaInstall } from "../../../usePwaInstall";
import { createWhipSession } from "../../../whip";

export function usePublisherController() {
  const runtime = useRuntime();
  const [streamId, setStreamId] = useState(config.defaultStreamId);
  const [token, setToken] = useState(() => runtime.sessionStore.get("gcs.accessToken") || "");
  const [status, setStatus] = useState<PublisherStatus>("idle");
  const [message, setMessage] = useState("송출 준비를 눌러 카메라와 센서를 시작하세요.");
  const [muted, setMuted] = useState(false);
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isOnline, setIsOnline] = useState(runtime.network.online);
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
  const quality = useAdaptiveQuality(peerConnection, media, status === "live", runtime.scheduler);
  const pwa = usePwaInstall();

  const prepare = useCallback(async () => {
    try {
      setStatus("requesting");
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
      mediaRef.current = nextMedia;
      setMedia(nextMedia);
      if (videoRef.current) videoRef.current.srcObject = nextMedia;
      await startSensors();
      wakeLockRef.current = await runtime.wakeLock.request();
      setStatus("preview");
      setMessage("후면 카메라와 센서가 준비됐습니다.");
    } catch (reason) {
      setStatus("error");
      setMessage(reason instanceof Error ? reason.message : "기기 권한을 받을 수 없습니다.");
    }
  }, [runtime, startSensors, token]);

  const publish = useCallback(async () => {
    if (!mediaRef.current) return;
    try {
      setStatus("authorizing");
      const authorization = await authorizePublish(streamId.trim(), token.trim(), runtime.fetch);
      setStatus("connecting");
      peerConnectionRef.current?.close();
      const connection = await createWhipSession(
        mediaRef.current,
        authorization.whipUrl,
        authorization.iceServers,
        (state) => {
          if (state !== "disconnected" && state !== "failed") return;
          setStatus("reconnecting");
          setMessage("네트워크 연결을 복구하고 있습니다.");
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
      peerConnectionRef.current = connection;
      setPeerConnection(connection);
      startedAtRef.current = runtime.clock.now();
      reconnectAttemptRef.current = 0;
      setStatus("live");
      setMessage("영상과 현장 센서를 송출하고 있습니다.");
    } catch (reason) {
      if (mediaRef.current && !runtime.network.online) {
        setStatus("reconnecting");
        setMessage("네트워크 연결을 기다리고 있습니다.");
      } else {
        setStatus("error");
        setMessage(reason instanceof Error ? reason.message : "송출을 시작하지 못했습니다.");
      }
    }
  }, [runtime, streamId, token]);

  const stop = useCallback(() => {
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
    if (videoRef.current) videoRef.current.srcObject = null;
    stopSensors();
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setStatus("idle");
    setMessage("송출을 종료했습니다.");
  }, [runtime.scheduler, stopSensors]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    mediaRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  useEffect(() => runtime.network.subscribe(
    () => {
      setIsOnline(true);
      if (mediaRef.current && (status === "reconnecting" || status === "error")) {
        setMessage("네트워크가 복구되어 송출을 다시 연결합니다.");
        void publishRef.current();
      }
    },
    () => {
      setIsOnline(false);
      if (mediaRef.current) {
        setStatus("reconnecting");
        setMessage("네트워크가 끊겼습니다. 연결 복구를 기다립니다.");
      }
    },
  ), [runtime.network, status]);

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
        setMessage(reason instanceof Error ? reason.message : "센서 전송 오류");
      });
    }, 2_000);
    return () => runtime.scheduler.clearInterval(id);
  }, [runtime, snapshot, status, streamId, token]);

  useEffect(() => stop, [stop]);

  return {
    canInstall: pwa.canInstall,
    install: pwa.install,
    isInstalled: pwa.isInstalled,
    isOnline,
    mediaReady: Boolean(media),
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
    setStreamId,
    token,
    setToken,
    toggleMute,
    videoRef,
  } as const;
}
