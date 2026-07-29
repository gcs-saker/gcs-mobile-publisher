import { describe, expect, it, vi } from "vitest";
import type { RandomSource, Scheduler } from "../../../app/ports";
import { ReconnectPolicy } from "../domain/reconnectPolicy";
import { ReconnectScheduler } from "./ReconnectScheduler";

interface FakeClock {
  callbacks: Map<number, () => void>;
  scheduler: Scheduler;
}

function fakeClock(): FakeClock {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    callbacks,
    scheduler: {
      clearInterval: vi.fn(),
      clearTimeout: vi.fn((id: number) => {
        callbacks.delete(id);
      }),
      setInterval: vi.fn(() => 100),
      setTimeout: vi.fn((callback: () => void) => {
        const id = nextId;
        nextId += 1;
        callbacks.set(id, callback);
        return id;
      }),
    },
  };
}

function subject(clock: FakeClock, maxAttempts = 2): ReconnectScheduler {
  const random: RandomSource = { next: () => 0.5 };
  return new ReconnectScheduler(
    clock.scheduler,
    new ReconnectPolicy(
      {
        baseDelayMs: 1_000,
        jitterRatio: 0,
        maxAttempts,
        maxDelayMs: 10_000,
      },
      random,
    ),
  );
}

function fireNext(clock: FakeClock): void {
  const entry = clock.callbacks.entries().next();
  if (entry.done) throw new Error("No scheduled callback");
  const [id, callback] = entry.value;
  clock.callbacks.delete(id);
  callback();
}

describe("ReconnectScheduler", () => {
  it("executes a scheduled retry through a fake clock", () => {
    const clock = fakeClock();
    const reconnect = subject(clock);
    const callback = vi.fn();

    expect(reconnect.schedule(callback)).toEqual({
      outcome: "scheduled",
      schedule: { attempt: 1, delayMs: 1_000 },
    });
    expect(callback).not.toHaveBeenCalled();

    fireNext(clock);

    expect(callback).toHaveBeenCalledWith(1);
  });

  it("does not create duplicate pending timers", () => {
    const clock = fakeClock();
    const reconnect = subject(clock);

    reconnect.schedule(vi.fn());

    expect(reconnect.schedule(vi.fn())).toEqual({ outcome: "pending" });
    expect(clock.scheduler.setTimeout).toHaveBeenCalledOnce();
  });

  it("reports exhaustion after the maximum attempts", () => {
    const clock = fakeClock();
    const reconnect = subject(clock, 1);

    reconnect.schedule(vi.fn());
    fireNext(clock);

    expect(reconnect.schedule(vi.fn())).toEqual({ outcome: "exhausted" });
  });

  it("ignores a stale callback after reset even if the host invokes it", () => {
    const clock = fakeClock();
    const reconnect = subject(clock);
    const callback = vi.fn();
    reconnect.schedule(callback);
    const staleCallback = [...clock.callbacks.values()][0];
    if (!staleCallback) throw new Error("Expected a scheduled callback");

    reconnect.reset();
    staleCallback();

    expect(callback).not.toHaveBeenCalled();
    expect(reconnect.schedule(callback)).toMatchObject({
      outcome: "scheduled",
      schedule: { attempt: 1 },
    });
  });

  it("preserves attempt count when only the pending timer is cancelled", () => {
    const clock = fakeClock();
    const reconnect = subject(clock);
    reconnect.schedule(vi.fn());
    fireNext(clock);
    reconnect.schedule(vi.fn());

    reconnect.cancel();

    expect(reconnect.schedule(vi.fn())).toMatchObject({
      outcome: "scheduled",
      schedule: { attempt: 2 },
    });
  });
});
