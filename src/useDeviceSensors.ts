import { useCallback, useEffect, useRef, useState } from "react";
import { emptySnapshot } from "./sensors";
import type { SensorSnapshot } from "./types";
import type { BatteryPort, Clock, OrientationMonitor } from "./app/ports";
import { createSpeedStabilizer } from "./features/sensors/domain/speedStabilizer";
import { screenAdjustedTilt, smoothAngle, smoothLinear } from "./features/sensors/domain/orientationIndicators";

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
  const speed = useRef(createSpeedStabilizer());
  const generation = useRef(0);

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
    const adjusted = screenAdjustedTilt(event.beta, event.gamma, dependencies.orientation.screenAngle);
    setSnapshot((current) => ({
      ...current,
      capturedAt: dependencies.clock.isoNow(),
      orientation: {
        alpha: smoothAngle(current.orientation.alpha, event.alpha),
        beta: smoothLinear(current.orientation.beta, adjusted.beta),
        gamma: smoothLinear(current.orientation.gamma, adjusted.gamma),
        absolute: event.absolute,
      },
    }));
  }, [dependencies.clock]);

  const releaseResources = useCallback(() => {
    generation.current += 1;
    unsubscribeOrientation.current?.();
    unsubscribeOrientation.current = null;
    if (watchId.current !== null && dependencies.geolocation) {
      dependencies.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    battery.current?.removeEventListener("levelchange", updateBattery);
    battery.current?.removeEventListener("chargingchange", updateBattery);
    battery.current = null;
    speed.current.reset();
  }, [dependencies.geolocation, updateBattery]);

  const start = useCallback(async () => {
    releaseResources();
    const activeGeneration = ++generation.current;
    setError(null);
    unsubscribeOrientation.current = dependencies.orientation.subscribe(onOrientation);

    const nextBattery = await dependencies.battery.getBattery();
    if (activeGeneration !== generation.current) return;
    battery.current = nextBattery;
    if (nextBattery) {
      updateBattery();
      nextBattery.addEventListener("levelchange", updateBattery);
      nextBattery.addEventListener("chargingchange", updateBattery);
    }

    if (!dependencies.geolocation) {
      setError("이 기기에서는 GPS를 사용할 수 없습니다.");
      return;
    }
    watchId.current = dependencies.geolocation.watchPosition(
      ({ coords, timestamp }) => setSnapshot((current) => ({
        ...current,
        capturedAt: dependencies.clock.isoNow(),
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude,
          accuracy: coords.accuracy,
          speed: speed.current.update({
            accuracy: coords.accuracy,
            latitude: coords.latitude,
            longitude: coords.longitude,
            measuredAtMs: timestamp,
            reportedSpeedMps: coords.speed,
          }),
          heading: coords.heading,
        },
      })),
      (reason) => setError(`GPS: ${reason.message}`),
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 },
    );
  }, [dependencies, onOrientation, releaseResources, updateBattery]);

  const stop = releaseResources;

  useEffect(() => stop, [stop]);
  return { snapshot, error, start, stop };
}
