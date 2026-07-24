import type { ReturnTypeOfPublisherController } from "../types";

const STATUS_LABEL = {
  idle: "대기",
  requesting: "권한 요청",
  preview: "미리보기",
  authorizing: "인증 중",
  connecting: "연결 중",
  live: "LIVE",
  reconnecting: "재연결",
  error: "오류",
} as const;

export interface PublisherScreenProps {
  controller: ReturnTypeOfPublisherController;
}

export function PublisherScreen({ controller }: PublisherScreenProps) {
  const battery = controller.snapshot.battery;
  const batteryText = battery.supported && battery.level !== null
    ? `${Math.round(battery.level * 100)}%${battery.charging ? " · 충전" : ""}`
    : "지원 안 됨";
  const orientation = controller.snapshot.orientation;
  const location = controller.snapshot.location;

  return (
    <main className="app">
      <aside className="landscape-notice" role="status">
        <strong>휴대폰을 세로로 돌려주세요</strong>
        <span>안정적인 송출 조작을 위해 세로 화면을 사용합니다.</span>
      </aside>
      <video ref={controller.videoRef} className="camera" autoPlay muted playsInline />
      <div className="shade" />

      <header className="topbar">
        <div className={`live-pill live-pill--${controller.status}`}>
          {STATUS_LABEL[controller.status]}
        </div>
        <div className="topbar__title">
          <strong>GCS FIELD</strong>
          <span>{controller.streamId || "STREAM ID"}</span>
        </div>
        <div className="topbar__health">
          <span className={controller.isOnline ? "network network--online" : "network network--offline"}>
            {controller.isOnline ? "온라인" : "오프라인"}
          </span>
          <div className="battery" aria-label="배터리 상태">{batteryText}</div>
        </div>
      </header>

      <section className="level" aria-label="기기 기울기">
        <div className="level__crosshair">
          <span
            className="level__dot"
            style={{
              transform: `translate(${Math.max(-36, Math.min(36, orientation.gamma ?? 0))}px, ${Math.max(-36, Math.min(36, orientation.beta ?? 0))}px)`,
            }}
          />
        </div>
        <span>좌우 {orientation.gamma?.toFixed(1) ?? "—"}°</span>
        <span>앞뒤 {orientation.beta?.toFixed(1) ?? "—"}°</span>
      </section>

      <section className="telemetry">
        <div><span>GPS</span><strong>{location.latitude?.toFixed(6) ?? "대기"}</strong></div>
        <div><span>경도</span><strong>{location.longitude?.toFixed(6) ?? "대기"}</strong></div>
        <div><span>정확도</span><strong>{location.accuracy ? `±${location.accuracy.toFixed(0)}m` : "—"}</strong></div>
        <div><span>속도</span><strong>{location.speed !== null ? `${(location.speed * 3.6).toFixed(1)} km/h` : "—"}</strong></div>
      </section>

      <section className="control-sheet" aria-label="송출 제어">
        <div className="runtime-strip">
          <span>화질 <strong>{controller.quality === "high" ? "720p" : controller.quality === "medium" ? "540p" : "360p"}</strong></span>
          <span>PWA <strong>{controller.isInstalled ? "설치됨" : "브라우저"}</strong></span>
          {controller.canInstall ? <button onClick={() => void controller.install()}>앱 설치</button> : null}
        </div>
        <div className="fields">
          <label>
            <span>스트림 ID</span>
            <input value={controller.streamId} onChange={(event) => controller.setStreamId(event.target.value)} disabled={controller.status === "live"} />
          </label>
          <label>
            <span>Access Token</span>
            <input type="password" value={controller.token} onChange={(event) => controller.setToken(event.target.value)} disabled={controller.status === "live"} placeholder="Bearer token" />
          </label>
        </div>
        <p className={controller.status === "error" || controller.sensorError ? "message message--error" : "message"}>
          {controller.sensorError || controller.message}
        </p>
        <div className="actions">
          {controller.status === "idle" || controller.status === "error" ? (
            <button className="button button--prepare" onClick={() => void controller.prepare()}>송출 준비</button>
          ) : controller.status === "preview" ? (
            <button className="button button--live" onClick={() => void controller.publish()}>송출 시작</button>
          ) : (
            <button className="button button--stop" onClick={controller.stop}>송출 종료</button>
          )}
          <button className="button button--icon" onClick={controller.toggleMute} disabled={!controller.mediaReady}>
            {controller.muted ? "마이크 켜기" : "음소거"}
          </button>
        </div>
      </section>
    </main>
  );
}
