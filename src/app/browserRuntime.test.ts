import { describe, expect, it, vi } from "vitest";
import { overrideRuntime } from "./browserRuntime";
import type { RuntimeDependencies } from "./ports";

function fakeRuntime(): RuntimeDependencies {
  return {
    battery: { getBattery: async () => null },
    clock: { now: () => 10, isoNow: () => "1970-01-01T00:00:00.010Z" },
    fetch: vi.fn(),
    geolocation: null,
    mediaDevices: null,
    network: { online: true, subscribe: () => () => undefined },
    orientation: { subscribe: () => () => undefined },
    peerConnections: { create: vi.fn() },
    scheduler: {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 2),
      clearTimeout: vi.fn(),
    },
    sessionStore: { get: () => null, set: vi.fn(), remove: vi.fn() },
    userAgent: "fake",
    wakeLock: { request: async () => null },
  };
}

describe("overrideRuntime", () => {
  it("replaces a port without mutating the base runtime", () => {
    const base = fakeRuntime();
    const clock = { now: () => 99, isoNow: () => "changed" };
    const result = overrideRuntime(base, { clock });

    expect(result.clock).toBe(clock);
    expect(base.clock.now()).toBe(10);
    expect(result.network).toBe(base.network);
  });
});
