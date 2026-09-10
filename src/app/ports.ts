export interface Clock {
  now(): number;
  isoNow(): string;
}

export interface Scheduler {
  setInterval(callback: () => void, delayMs: number): number;
  clearInterval(id: number): void;
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(id: number): void;
}

export interface NetworkMonitor {
  readonly online: boolean;
  subscribe(onOnline: () => void, onOffline: () => void): () => void;
}

export interface PageLifecycleMonitor {
  subscribeResume(listener: () => void): () => void;
}

export interface RandomSource {
  next(): number;
}

export interface SessionStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface OrientationMonitor {
  readonly screenAngle: number;
  subscribe(listener: (event: DeviceOrientationEvent) => void): () => void;
}

export interface BatteryPort {
  getBattery(): Promise<BatteryManager | null>;
}

export interface WakeLockPort {
  request(): Promise<WakeLockSentinel | null>;
}

export interface PeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection;
}

export interface RuntimeDependencies {
  battery: BatteryPort;
  clock: Clock;
  fetch: typeof fetch;
  geolocation: Geolocation | null;
  mediaDevices: MediaDevices | null;
  lifecycle: PageLifecycleMonitor;
  network: NetworkMonitor;
  orientation: OrientationMonitor;
  peerConnections: PeerConnectionFactory;
  random: RandomSource;
  scheduler: Scheduler;
  sessionStore: SessionStore;
  userAgent: string;
  wakeLock: WakeLockPort;
}
