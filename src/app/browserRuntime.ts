import type { RuntimeDependencies } from "./ports";

export function createBrowserRuntime(): RuntimeDependencies {
  return {
    battery: {
      getBattery: () => navigator.getBattery?.() ?? Promise.resolve(null),
    },
    clock: {
      now: () => Date.now(),
      isoNow: () => new Date().toISOString(),
    },
    fetch: window.fetch.bind(window),
    geolocation: navigator.geolocation ?? null,
    mediaDevices: navigator.mediaDevices ?? null,
    network: {
      get online() {
        return navigator.onLine;
      },
      subscribe(onOnline, onOffline) {
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        return () => {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        };
      },
    },
    orientation: {
      subscribe(listener) {
        window.addEventListener("deviceorientation", listener, true);
        return () => window.removeEventListener("deviceorientation", listener, true);
      },
    },
    peerConnections: {
      create: (configuration) => new RTCPeerConnection(configuration),
    },
    scheduler: {
      setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
      clearInterval: (id) => window.clearInterval(id),
      setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimeout: (id) => window.clearTimeout(id),
    },
    sessionStore: {
      get: (key) => sessionStorage.getItem(key),
      set: (key, value) => sessionStorage.setItem(key, value),
      remove: (key) => sessionStorage.removeItem(key),
    },
    userAgent: navigator.userAgent,
    wakeLock: {
      request: () => navigator.wakeLock?.request("screen") ?? Promise.resolve(null),
    },
  };
}

export function overrideRuntime(
  base: RuntimeDependencies,
  overrides: Partial<RuntimeDependencies>,
): RuntimeDependencies {
  return { ...base, ...overrides };
}
