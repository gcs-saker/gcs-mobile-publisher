import type { Scheduler } from "../../../app/ports";
import type {
  ReconnectPolicy,
  ReconnectSchedule,
} from "../domain/reconnectPolicy";

export interface ScheduledReconnect {
  outcome: "scheduled";
  schedule: ReconnectSchedule;
}

export interface PendingReconnect {
  outcome: "pending";
}

export interface ExhaustedReconnect {
  outcome: "exhausted";
}

export type ReconnectSchedulingResult =
  | ScheduledReconnect
  | PendingReconnect
  | ExhaustedReconnect;

export class ReconnectScheduler {
  private completedAttempts = 0;
  private epoch = 0;
  private timerId: number | null = null;

  constructor(
    private readonly scheduler: Scheduler,
    private readonly policy: ReconnectPolicy,
  ) {}

  schedule(callback: (attempt: number) => void): ReconnectSchedulingResult {
    if (this.timerId !== null) return { outcome: "pending" };
    const schedule = this.policy.next(this.completedAttempts);
    if (!schedule) return { outcome: "exhausted" };

    const scheduledEpoch = this.epoch;
    this.timerId = this.scheduler.setTimeout(() => {
      this.timerId = null;
      if (scheduledEpoch !== this.epoch) return;
      this.completedAttempts = schedule.attempt;
      callback(schedule.attempt);
    }, schedule.delayMs);
    return { outcome: "scheduled", schedule };
  }

  cancel(): void {
    this.epoch += 1;
    if (this.timerId !== null) this.scheduler.clearTimeout(this.timerId);
    this.timerId = null;
  }

  reset(): void {
    this.cancel();
    this.completedAttempts = 0;
  }
}
