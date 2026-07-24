import { useCallback, useEffect, useRef, useState } from "react";
import { authorizePublish, sendTelemetry } from "./api";
import { config } from "./config";
import { buildTelemetryPayload } from "./sensors";
import type { PublisherStatus } from "./types";
import { useRuntime } from "./app/RuntimeProvider";
import { useAdaptiveQuality } from "./useAdaptiveQuality";
import { useDeviceSensors } from "./useDeviceSensors";
import { usePwaInstall } from "./usePwaInstall";
import { createWhipSession } from "./whip";

const STATUS_LABEL: Record<PublisherStatus, string> = {
  idle: "대기",
  requesting: "권한 요청",
  preview: "미리보기",
  authorizing: "인증 중",
  connecting: "연결 중",
  live: "LIVE",
  reconnecting: "재연결",
  error: "오류",
};

export function App() {
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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const publishRef = useRef<() => Promise<void>>(async () => undefined);
  const startedAtRef = useRef(0);
  const { snapshot, error: sensorError, start: startSensors, stop: stopSensors } = useDeviceSensors(runtime);
  const quality = useAdaptiveQuality(peerConnection, media, status === "live", runtime.scheduler);
  const { canInstall, install, isInstalled } = usePwaInstall();

  const prepare = useCallback(async () => {
    try {
      setStatus("requesting");
      if (token.trim()) runtime.sessionStore.set("gcs.accessToken", token.trim());
      else runtime.sessionStore.remove("gcs.accessToken");
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      if (!runtime.mediaDevices) throw new Error("이 기기에서는 카메라를 사용할 수 없습니다.");
      const media = await runtime.mediaDevices.getUserMedia({
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
      mediaRef.current = media;
      setMedia(media);
      if (videoRef.current) videoRef.current.srcObject = media;
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
      pcRef.current?.close();
      const connection = await createWhipSession(
        mediaRef.current,
        authorization.whipUrl,
        authorization.iceServers,
        (state) => {
          if (state === "disconnected" || state === "failed") {
            setStatus("reconnecting");
            setMessage("네트워크 연결을 복구하고 있습니다.");
            if (reconnectTimerRef.current === null) {
              const delay = Math.min(15_000, 1_000 * 2 ** reconnectAttemptRef.current);
              reconnectAttemptRef.current += 1;
              reconnectTimerRef.current = runtime.scheduler.setTimeout(() => {
                reconnectTimerRef.current = null;
                if (runtime.network.online && mediaRef.current) void publishRef.current();
              }, delay);
            }
          }
        },
        runtime.fetch,
        runtime.peerConnections,
        runtime.scheduler,
      );
      pcRef.current = connection;
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
    if (reconnectTimerRef.current !== null) runtime.scheduler.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    reconnectAttemptRef.current = 0;
    pcRef.current?.close();
    pcRef.current = null;
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

  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      if (mediaRef.current && (status === "reconnecting" || status === "error")) {
        setMessage("네트워크가 복구되어 송출을 다시 연결합니다.");
        void publishRef.current();
      }
    };
    const offline = () => {
      setIsOnline(false);
      if (mediaRef.current) {
        setStatus("reconnecting");
        setMessage("네트워크가 끊겼습니다. 연결 복구를 기다립니다.");
      }
    };
    return runtime.network.subscribe(online, offline);
  }, [runtime.network, status]);

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

  const batteryText = snapshot.battery.supported && snapshot.battery.level !== null
    ? `${Math.round(snapshot.battery.level * 100)}%${snapshot.battery.charging ? " · 충전" : ""}`
    : "지원 안 됨";

  return (
    <main className="app">
      <aside className="landscape-notice" role="status">
        <strong>휴대폰을 세로로 돌려주세요</strong>
        <span>안정적인 송출 조작을 위해 세로 화면을 사용합니다.</span>
      </aside>
      <video ref={videoRef} className="camera" autoPlay muted playsInline />
      <div className="shade" />

      <header className="topbar">
        <div className={`live-pill live-pill--${status}`}>{STATUS_LABEL[status]}</div>
        <div className="topbar__title">
          <strong>GCS FIELD</strong>
          <span>{streamId || "STREAM ID"}</span>
        </div>
        <div className="topbar__health">
          <span className={isOnline ? "network network--online" : "network network--offline"}>
            {isOnline ? "온라인" : "오프라인"}
          </span>
          <div className="battery" aria-label="배터리 상태">{batteryText}</div>
        </div>
      </header>

      <section className="level" aria-label="기기 기울기">
        <div className="level__crosshair">
          <span
            className="level__dot"
            style={{
              transform: `translate(${Math.max(-36, Math.min(36, snapshot.orientation.gamma ?? 0))}px, ${Math.max(-36, Math.min(36, snapshot.orientation.beta ?? 0))}px)`,
            }}
          />
        </div>
        <span>좌우 {snapshot.orientation.gamma?.toFixed(1) ?? "—"}°</span>
        <span>앞뒤 {snapshot.orientation.beta?.toFixed(1) ?? "—"}°</span>
      </section>

      <section className="telemetry">
        <div><span>GPS</span><strong>{snapshot.location.latitude?.toFixed(6) ?? "대기"}</strong></div>
        <div><span>경도</span><strong>{snapshot.location.longitude?.toFixed(6) ?? "대기"}</strong></div>
        <div><span>정확도</span><strong>{snapshot.location.accuracy ? `±${snapshot.location.accuracy.toFixed(0)}m` : "—"}</strong></div>
        <div><span>속도</span><strong>{snapshot.location.speed !== null ? `${(snapshot.location.speed * 3.6).toFixed(1)} km/h` : "—"}</strong></div>
      </section>

      <section className="control-sheet" aria-label="송출 제어">
        <div className="runtime-strip">
          <span>화질 <strong>{quality === "high" ? "720p" : quality === "medium" ? "540p" : "360p"}</strong></span>
          <span>PWA <strong>{isInstalled ? "설치됨" : "브라우저"}</strong></span>
          {canInstall ? <button onClick={() => void install()}>앱 설치</button> : null}
        </div>
        <div className="fields">
          <label>
            <span>스트림 ID</span>
            <input value={streamId} onChange={(event) => setStreamId(event.target.value)} disabled={status === "live"} />
          </label>
          <label>
            <span>Access Token</span>
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} disabled={status === "live"} placeholder="Bearer token" />
          </label>
        </div>
        <p className={status === "error" || sensorError ? "message message--error" : "message"}>
          {sensorError || message}
        </p>
        <div className="actions">
          {status === "idle" || status === "error" ? (
            <button className="button button--prepare" onClick={() => void prepare()}>송출 준비</button>
          ) : status === "preview" ? (
            <button className="button button--live" onClick={() => void publish()}>송출 시작</button>
          ) : (
            <button className="button button--stop" onClick={stop}>송출 종료</button>
          )}
          <button
            className="button button--icon"
            onClick={() => {
              const next = !muted;
              mediaRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
              setMuted(next);
            }}
            disabled={!mediaRef.current}
          >
            {muted ? "마이크 켜기" : "음소거"}
          </button>
        </div>
      </section>
    </main>
  );
}
