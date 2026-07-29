import { describe, expect, it } from "vitest";
import type { RandomSource } from "../../../app/ports";
import { ReconnectPolicy } from "./reconnectPolicy";

function policy(randomValue = 0.5): ReconnectPolicy {
  const random: RandomSource = { next: () => randomValue };
  return new ReconnectPolicy(
    {
      baseDelayMs: 1_000,
      jitterRatio: 0.2,
      maxAttempts: 5,
      maxDelayMs: 10_000,
    },
    random,
  );
}

describe("ReconnectPolicy", () => {
  it("uses exponential delays before reaching the cap", () => {
    const subject = policy();

    expect([0, 1, 2, 3, 4].map((attempt) => subject.next(attempt))).toEqual([
      { attempt: 1, delayMs: 1_000 },
      { attempt: 2, delayMs: 2_000 },
      { attempt: 3, delayMs: 4_000 },
      { attempt: 4, delayMs: 8_000 },
      { attempt: 5, delayMs: 10_000 },
    ]);
  });

  it("applies deterministic jitter without exceeding the maximum delay", () => {
    expect(policy(0).next(1)).toEqual({ attempt: 2, delayMs: 1_600 });
    expect(policy(0.999).next(1)).toEqual({ attempt: 2, delayMs: 2_399 });
    expect(policy(0.999).next(4)).toEqual({ attempt: 5, delayMs: 10_000 });
  });

  it("stops after the configured maximum attempts", () => {
    expect(policy().next(5)).toBeNull();
    expect(policy().next(6)).toBeNull();
  });

  it.each([-1, 0.5, Number.NaN])(
    "rejects invalid completed attempts: %s",
    (completedAttempts) => {
      expect(() => policy().next(completedAttempts)).toThrow(RangeError);
    },
  );

  it.each([-0.1, 1])("rejects invalid random output: %s", (randomValue) => {
    expect(() => policy(randomValue).next(0)).toThrow(RangeError);
  });

  it("validates its configuration", () => {
    const random: RandomSource = { next: () => 0.5 };
    expect(() => new ReconnectPolicy(
      { baseDelayMs: 0, jitterRatio: 0, maxAttempts: 1, maxDelayMs: 1 },
      random,
    )).toThrow(RangeError);
    expect(() => new ReconnectPolicy(
      { baseDelayMs: 10, jitterRatio: 2, maxAttempts: 1, maxDelayMs: 10 },
      random,
    )).toThrow(RangeError);
  });
});
