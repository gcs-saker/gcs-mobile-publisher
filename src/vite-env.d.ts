/// <reference types="vite/client" />

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

interface Navigator {
  getBattery?: () => Promise<BatteryManager>;
  wakeLock?: {
    request(type: "screen"): Promise<WakeLockSentinel>;
  };
}

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  release(): Promise<void>;
}
