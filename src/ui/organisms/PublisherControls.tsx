import type { VideoQuality } from "../../quality";
import type { PublisherStatus } from "../../types";
import { ActionButton } from "../atoms/ActionButton";
import { RuntimeStrip } from "../molecules/RuntimeStrip";
import { publisherStatusView } from "../publisherViewModel";

export interface PublisherControlsProps {
  canInstall: boolean;
  isInstalled: boolean;
  mediaReady: boolean;
  message: string;
  muted: boolean;
  onInstall(): Promise<void>;
  onPrepare(): Promise<void>;
  onPublish(): Promise<void>;
  onStop(): void;
  onToggleMute(): void;
  quality: VideoQuality;
  sensorError: string | null;
  status: PublisherStatus;
}

export function PublisherControls(props: PublisherControlsProps) {
  const view = publisherStatusView(props.status);
  function runPrimaryAction(): void {
    if (view.primaryAction.action === "prepare") void props.onPrepare();
    else if (view.primaryAction.action === "publish") void props.onPublish();
    else props.onStop();
  }
  return (
    <section className="control-sheet" aria-label="송출 제어">
      <RuntimeStrip canInstall={props.canInstall} isInstalled={props.isInstalled}
        onInstall={props.onInstall} quality={props.quality} />
      <p className={props.status === "error" || props.sensorError ? "message message--error" : "message"}
        role={props.status === "error" || props.sensorError ? "alert" : "status"}>
        {props.sensorError || props.message}
      </p>
      <div className="actions">
        <ActionButton onClick={runPrimaryAction} tone={view.primaryAction.tone}>
          {view.primaryAction.label}
        </ActionButton>
        <ActionButton disabled={!props.mediaReady} onClick={props.onToggleMute} tone="secondary">
          {props.muted ? "마이크 켜기" : "음소거"}
        </ActionButton>
      </div>
    </section>
  );
}
