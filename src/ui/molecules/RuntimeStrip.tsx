import type { VideoQuality } from "../../quality";

export interface RuntimeStripProps {
  canInstall: boolean;
  isInstalled: boolean;
  onInstall(): Promise<void>;
  quality: VideoQuality;
}

const QUALITY_LABEL: Readonly<Record<VideoQuality, string>> = {
  high: "720p",
  medium: "540p",
  low: "360p",
};

export function RuntimeStrip({
  canInstall,
  isInstalled,
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
    </div>
  );
}
