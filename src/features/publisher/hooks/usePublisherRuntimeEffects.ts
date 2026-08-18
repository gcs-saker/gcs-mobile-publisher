import { useEffect, useRef, type MutableRefObject } from "react";
import type { RuntimeDependencies } from "../../../app/ports";
import { buildTelemetryPayload } from "../../../sensors";
import type { SensorSnapshot } from "../../../types";
import type { AuthenticatedAccount } from "../../auth/contracts/authentication";
import { PublisherConnectionCoordinator } from "../application/PublisherConnectionCoordinator";
import { PublisherRuntimeCoordinator } from "../application/PublisherRuntimeCoordinator";
import { ReconnectScheduler } from "../application/ReconnectScheduler";
import type { PublisherStore } from "../application/publisherStore";
import type { PublisherGateway } from "../contracts/publisherGateway";
import type { PublisherEvent, PublisherTransition } from "../domain/publisherMachine";
import { MediaCaptureController } from "../infrastructure/MediaCaptureController";

interface PublisherRuntimeEffectsOptions {
  connectionCoordinator: PublisherConnectionCoordinator;
  dispatch: (event: PublisherEvent) => PublisherTransition;
  gateway: PublisherGateway;
  identity: AuthenticatedAccount | null;
  mediaController: MediaCaptureController;
  reconnectScheduler: ReconnectScheduler;
  renewalTimerRef: MutableRefObject<number | null>;
  runtime: RuntimeDependencies;
  scheduleReconnect: (generation: number) => void;
  sensorSnapshot: SensorSnapshot;
  startedAtRef: MutableRefObject<number>;
  status: string;
  store: PublisherStore;
}

export function usePublisherRuntimeEffects(options: PublisherRuntimeEffectsOptions) {
  const {
    connectionCoordinator, dispatch, gateway, identity, mediaController, reconnectScheduler,
    renewalTimerRef, runtime, scheduleReconnect, sensorSnapshot, startedAtRef, status, store,
  } = options;
  const runtimeCoordinatorRef = useRef<PublisherRuntimeCoordinator | null>(null);
  runtimeCoordinatorRef.current ??= new PublisherRuntimeCoordinator(sensorSnapshot);
  const runtimeCoordinator = runtimeCoordinatorRef.current;

  useEffect(() => {
    runtimeCoordinator.updateSensorSnapshot(sensorSnapshot);
  }, [runtimeCoordinator, sensorSnapshot]);

  useEffect(() => runtime.network.subscribe(
    () => {
      store.setState({ isOnline: true });
      const current = store.getSnapshot();
      if (mediaController.stream && current.status === "reconnecting") {
        store.setState({ message: "네트워크가 복구되어 송출을 다시 연결합니다." });
        scheduleReconnect(current.generation);
      }
    },
    () => {
      store.setState({ isOnline: false });
      reconnectScheduler.cancel();
      if (!mediaController.stream) return;
      const current = store.getSnapshot();
      const lost = dispatch({ type: "CONNECTION_LOST", generation: current.generation });
      if (lost.accepted) store.setState({ message: "네트워크가 끊겼습니다. 연결 복구를 기다립니다." });
    },
  ), [dispatch, mediaController, reconnectScheduler, runtime.network, scheduleReconnect, store]);

  useEffect(() => {
    if (status !== "live" || !identity) return;
    renewalTimerRef.current = runtime.scheduler.setInterval(() => {
      const session = connectionCoordinator.session;
      if (!session) return;
      void runtimeCoordinator.runRenewal(async () => {
        try {
          const renewed = await gateway.renew(session);
          if (connectionCoordinator.session?.sessionId === session.sessionId) {
            connectionCoordinator.replaceSession(renewed);
          }
        } catch (reason: unknown) {
          store.setState({ message: reason instanceof Error ? reason.message : "송출 세션 갱신 오류" });
        }
      });
    }, 120_000);
    const telemetryTimer = runtime.scheduler.setInterval(() => {
      void runtimeCoordinator.runTelemetry(async () => {
        try {
          await gateway.sendTelemetry(buildTelemetryPayload(
            store.getSnapshot().streamId, startedAtRef.current, runtimeCoordinator.sensorSnapshot,
            runtime.clock, runtime.userAgent,
          ), identity);
        } catch (reason: unknown) {
          store.setState({ message: reason instanceof Error ? reason.message : "센서 전송 오류" });
        }
      });
    }, 2_000);
    return () => {
      runtime.scheduler.clearInterval(telemetryTimer);
      if (renewalTimerRef.current !== null) runtime.scheduler.clearInterval(renewalTimerRef.current);
      renewalTimerRef.current = null;
    };
  }, [connectionCoordinator, gateway, identity, renewalTimerRef, runtime, runtimeCoordinator, startedAtRef, status, store]);
}
