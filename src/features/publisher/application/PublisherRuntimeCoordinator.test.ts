import { describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "../../../sensors";
import { PublisherRuntimeCoordinator } from "./PublisherRuntimeCoordinator";

describe("PublisherRuntimeCoordinator", () => {
  it("retains the latest sensor snapshot without recreating runtime timers", () => {
    const coordinator = new PublisherRuntimeCoordinator(emptySnapshot);
    const latest = {
      ...emptySnapshot,
      orientation: { ...emptySnapshot.orientation, alpha: 90 },
    };

    coordinator.updateSensorSnapshot(latest);

    expect(coordinator.sensorSnapshot).toBe(latest);
  });

  it("prevents overlapping telemetry and allows the next task after completion", async () => {
    let finishFirst: (() => void) | undefined;
    const first = vi.fn(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const second = vi.fn().mockResolvedValue(undefined);
    const coordinator = new PublisherRuntimeCoordinator(emptySnapshot);

    const running = coordinator.runTelemetry(first);
    await expect(coordinator.runTelemetry(second)).resolves.toBe(false);
    expect(second).not.toHaveBeenCalled();

    finishFirst?.();
    await expect(running).resolves.toBe(true);
    await expect(coordinator.runTelemetry(second)).resolves.toBe(true);
    expect(second).toHaveBeenCalledOnce();
  });
});
