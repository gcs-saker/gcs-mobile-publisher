import { PublisherControls } from "../organisms/PublisherControls";
import { PublisherHeader } from "../organisms/PublisherHeader";
import { SensorDashboard } from "../organisms/SensorDashboard";
import type { ReturnTypeOfPublisherController } from "../types";

export interface PublisherScreenProps {
  controller: ReturnTypeOfPublisherController;
  principalName: string;
  onLogout(): Promise<void>;
}

export function PublisherScreen({
  controller,
  principalName,
  onLogout,
}: PublisherScreenProps) {
  return (
    <main className="app">
      <aside className="landscape-notice" role="status">
        <strong>휴대폰을 세로로 돌려주세요</strong>
        <span>안정적인 송출 조작을 위해 세로 화면을 사용합니다.</span>
      </aside>
      <video ref={controller.videoRef} className="camera" autoPlay muted playsInline />
      <div className="shade" aria-hidden="true" />
      <PublisherHeader
        battery={controller.snapshot.battery}
        principalName={principalName}
        isOnline={controller.isOnline}
        onLogout={onLogout}
        status={controller.status}
      />
      <SensorDashboard coordinatePrecision={controller.coordinatePrecision} snapshot={controller.snapshot} />
      <PublisherControls
        canInstall={controller.canInstall}
        isInstalled={controller.isInstalled}
        cameraFacingMode={controller.cameraFacingMode}
        coordinatePrecision={controller.coordinatePrecision}
        mediaReady={controller.mediaReady}
        message={controller.message}
        muted={controller.muted}
        onInstall={controller.install}
        onCameraFacingModeChange={controller.setCameraFacingMode}
        onCoordinatePrecisionChange={controller.setCoordinatePrecision}
        onPrepare={controller.prepare}
        onPublish={controller.publish}
        onStop={controller.stop}
        onToggleMute={controller.toggleMute}
        quality={controller.quality}
        sensorError={controller.sensorError}
        status={controller.status}
      />
    </main>
  );
}
