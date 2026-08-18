import type { VideoQuality } from "../../quality";
import {
  COORDINATE_PRECISIONS,
  isCoordinatePrecision,
  type CameraFacingMode,
  type CoordinatePrecision,
} from "../../features/publisher/domain/publisherSettings";

export interface RuntimeStripProps {
  cameraFacingMode: CameraFacingMode;
  canInstall: boolean;
  coordinatePrecision: CoordinatePrecision;
  disabled: boolean;
  isInstalled: boolean;
  onInstall(): Promise<void>;
  onCameraFacingModeChange(value: CameraFacingMode): Promise<void>;
  onCoordinatePrecisionChange(value: CoordinatePrecision): void;
  quality: VideoQuality;
}

const QUALITY_LABEL: Readonly<Record<VideoQuality, string>> = {
  high: "720p",
  medium: "540p",
  low: "360p",
};

export function RuntimeStrip({
  cameraFacingMode,
  canInstall,
  coordinatePrecision,
  disabled,
  isInstalled,
  onCameraFacingModeChange,
  onCoordinatePrecisionChange,
  onInstall,
  quality,
}: RuntimeStripProps) {
  return (
    <div className="runtime-strip">
      <span>화질 <strong>{QUALITY_LABEL[quality]}</strong></span>
      <span>PWA <strong>{isInstalled ? "설치됨" : "브라우저"}</strong></span>
      {canInstall ? (
        <button onClick={() => void onInstall()} type="button">앱 설치</button>
      ) : null}
      <details className="publisher-settings">
        <summary>송출 설정</summary>
        <div className="publisher-settings__fields">
          <label>좌표
            <select aria-label="좌표 소수점 자릿수" onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (isCoordinatePrecision(value)) onCoordinatePrecisionChange(value);
            }} value={coordinatePrecision}>
              {COORDINATE_PRECISIONS.map((value) => <option key={value} value={value}>{value}자리</option>)}
            </select>
          </label>
          <label>카메라
            <select aria-label="카메라 선택" disabled={disabled} onChange={(event) =>
              void onCameraFacingModeChange(event.currentTarget.value as CameraFacingMode)} value={cameraFacingMode}>
              <option value="environment">후면</option>
              <option value="user">전면</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}
