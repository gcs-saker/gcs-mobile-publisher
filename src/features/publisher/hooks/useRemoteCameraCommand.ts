import { useEffect, useRef } from "react";
import { fetchCameraControlCommand } from "../../../api";
import type { RuntimeDependencies } from "../../../app/ports";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import type { CameraFacingMode } from "../domain/publisherSettings";

const CAMERA_COMMAND_INTERVAL_MS = 2_000;

export function useRemoteCameraCommand(input: {
  identity: AuthenticatedAccount | null;
  onFacingMode: (mode: CameraFacingMode) => Promise<void>;
  onError: (message: string) => void;
  runtime: RuntimeDependencies;
  streamId: string;
  active: boolean;
}): void {
  const { active, identity, onError, onFacingMode, runtime, streamId } = input;
  const revisionRef = useRef(0);
  const inFlightRef = useRef(false);
  useEffect(() => {
    if (!active || !identity || !streamId) return undefined;
    revisionRef.current = 0;
    const check = async (): Promise<void> => {
      if (inFlightRef.current || !runtime.network.online) return;
      inFlightRef.current = true;
      try {
        const command = await fetchCameraControlCommand(identity, streamId, runtime.fetch);
        if (command.revision > revisionRef.current && command.facingMode) {
          revisionRef.current = command.revision;
          await onFacingMode(command.facingMode);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "원격 카메라 제어 연결을 확인할 수 없습니다.");
      } finally {
        inFlightRef.current = false;
      }
    };
    void check();
    const intervalId = runtime.scheduler.setInterval(() => void check(), CAMERA_COMMAND_INTERVAL_MS);
    return () => runtime.scheduler.clearInterval(intervalId);
  }, [active, identity, onError, onFacingMode, runtime, streamId]);
}
