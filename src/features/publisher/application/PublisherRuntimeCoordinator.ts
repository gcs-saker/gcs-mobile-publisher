import type { SensorSnapshot } from "../../../types";

type RuntimeTask = () => Promise<void>;

export class PublisherRuntimeCoordinator {
  private latestSensorSnapshot: SensorSnapshot;
  private renewalInFlight = false;
  private telemetryInFlight = false;

  constructor(initialSensorSnapshot: SensorSnapshot) {
    this.latestSensorSnapshot = initialSensorSnapshot;
  }

  get sensorSnapshot(): SensorSnapshot {
    return this.latestSensorSnapshot;
  }

  updateSensorSnapshot(snapshot: SensorSnapshot): void {
    this.latestSensorSnapshot = snapshot;
  }

  runRenewal(task: RuntimeTask): Promise<boolean> {
    return this.runSingleFlight("renewal", task);
  }

  runTelemetry(task: RuntimeTask): Promise<boolean> {
    return this.runSingleFlight("telemetry", task);
  }

  private async runSingleFlight(kind: "renewal" | "telemetry", task: RuntimeTask): Promise<boolean> {
    if (kind === "renewal" ? this.renewalInFlight : this.telemetryInFlight) return false;
    if (kind === "renewal") this.renewalInFlight = true;
    else this.telemetryInFlight = true;
    try {
      await task();
      return true;
    } finally {
      if (kind === "renewal") this.renewalInFlight = false;
      else this.telemetryInFlight = false;
    }
  }
}
