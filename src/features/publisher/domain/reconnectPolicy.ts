import type { RandomSource } from "../../../app/ports";

export interface ReconnectPolicyConfiguration {
  baseDelayMs: number;
  jitterRatio: number;
  maxAttempts: number;
  maxDelayMs: number;
}

export interface ReconnectSchedule {
  attempt: number;
  delayMs: number;
}

export class ReconnectPolicy {
  constructor(
    private readonly configuration: ReconnectPolicyConfiguration,
    private readonly random: RandomSource,
  ) {
    validateConfiguration(configuration);
  }

  next(completedAttempts: number): ReconnectSchedule | null {
    if (!Number.isInteger(completedAttempts) || completedAttempts < 0) {
      throw new RangeError("completedAttempts must be a non-negative integer");
    }
    if (completedAttempts >= this.configuration.maxAttempts) return null;

    const randomUnit = this.random.next();
    if (randomUnit < 0 || randomUnit >= 1) {
      throw new RangeError("RandomSource.next must return a value from 0 inclusive to 1 exclusive");
    }

    const exponentialDelay = this.configuration.baseDelayMs * 2 ** completedAttempts;
    const cappedDelay = Math.min(this.configuration.maxDelayMs, exponentialDelay);
    const jitter = cappedDelay * this.configuration.jitterRatio * (randomUnit * 2 - 1);

    return {
      attempt: completedAttempts + 1,
      delayMs: Math.round(
        Math.max(0, Math.min(this.configuration.maxDelayMs, cappedDelay + jitter)),
      ),
    };
  }
}

function validateConfiguration(configuration: ReconnectPolicyConfiguration): void {
  if (!Number.isFinite(configuration.baseDelayMs) || configuration.baseDelayMs <= 0) {
    throw new RangeError("baseDelayMs must be positive");
  }
  if (
    !Number.isFinite(configuration.maxDelayMs)
    || configuration.maxDelayMs < configuration.baseDelayMs
  ) {
    throw new RangeError("maxDelayMs must be at least baseDelayMs");
  }
  if (!Number.isInteger(configuration.maxAttempts) || configuration.maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  if (
    !Number.isFinite(configuration.jitterRatio)
    || configuration.jitterRatio < 0
    || configuration.jitterRatio > 1
  ) {
    throw new RangeError("jitterRatio must be between 0 and 1");
  }
}
