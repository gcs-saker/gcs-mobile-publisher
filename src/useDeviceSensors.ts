import { useCallback, useEffect, useRef, useState } from "react";
import { emptySnapshot } from "./sensors";
import type { SensorSnapshot } from "./types";
import type { BatteryPort, Clock, OrientationMonitor } from "./app/ports";

export interface DeviceSensorDependencies {
  battery: BatteryPort;
  clock: Clock;
  geolocation: Geolocation | null;
  orientation: OrientationMonitor;
}

export function useDeviceSensors(dependencies: DeviceSensorDependencies) {
  const [snapshot, setSnapshot] = useState<SensorSnapshot>(emptySnapshot);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const unsubscribeOrientation = useRef<(() => void) | null>(null);
  const battery = useRef<BatteryManager | null>(null);

  const updateBattery = useCallback(() => {
    const value = battery.current;
    setSnapshot((current) => ({
      ...current,
      capturedAt: dependencies.clock.isoNow(),
      battery: {
        supported: Boolean(value),
        level: value ? value.level : null,
        charging: value ? value.charging : null,
      },
    }));
  }, [dependencies.clock]);

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    setSnapshot((current) => ({
      ...current,
      capturedAt: dependencies.clock.isoNow(),
      orientation: {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      },
    }));
  }, [dependencies.clock]);

  const start = useCallback(async () => {
    setError(null);
    unsubscribeOrientation.current?.();
    unsubscribeOrientation.current = dependencies.orientation.subscribe(onOrientation);

    battery.current = await dependencies.battery.getBattery();
    if (battery.current) {
      updateBattery();
      battery.current.addEventListener("levelchange", updateBattery);
      battery.current.addEventListener("chargingchange", updateBattery);
    }

    if (!dependencies.geolocation) {
      setError("이 기기에서는 GPS를 사용할 수 없습니다.");
      return;
    }
    watchId.current = dependencies.geolocation.watchPosition(
      ({ coords }) => setSnapshot((current) => ({
        ...current,
        capturedAt: dependencies.clock.isoNow(),
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude,
          accuracy: coords.accuracy,
          speed: coords.speed,
          heading: coords.heading,
        },
      })),
      (reason) => setError(`GPS: ${reason.message}`),
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 },
    );
  }, [dependencies, onOrientation, updateBattery]);

  const stop = useCallback(() => {
    unsubscribeOrientation.current?.();
    unsubscribeOrientation.current = null;
    if (watchId.current !== null && dependencies.geolocation) {
      dependencies.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    battery.current?.removeEventListener("levelchange", updateBattery);
    battery.current?.removeEventListener("chargingchange", updateBattery);
    battery.current = null;
  }, [dependencies.geolocation, updateBattery]);

  useEffect(() => stop, [stop]);
  return { snapshot, error, start, stop };
}
