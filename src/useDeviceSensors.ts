import { useCallback, useEffect, useRef, useState } from "react";
import { emptySnapshot } from "./sensors";
import type { SensorSnapshot } from "./types";

export function useDeviceSensors() {
  const [snapshot, setSnapshot] = useState<SensorSnapshot>(emptySnapshot);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const battery = useRef<BatteryManager | null>(null);

  const updateBattery = useCallback(() => {
    const value = battery.current;
    setSnapshot((current) => ({
      ...current,
      capturedAt: new Date().toISOString(),
      battery: {
        supported: Boolean(value),
        level: value ? value.level : null,
        charging: value ? value.charging : null,
      },
    }));
  }, []);

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    setSnapshot((current) => ({
      ...current,
      capturedAt: new Date().toISOString(),
      orientation: {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      },
    }));
  }, []);

  const start = useCallback(async () => {
    setError(null);
    window.addEventListener("deviceorientation", onOrientation, true);

    if (navigator.getBattery) {
      battery.current = await navigator.getBattery();
      updateBattery();
      battery.current.addEventListener("levelchange", updateBattery);
      battery.current.addEventListener("chargingchange", updateBattery);
    }

    if (!navigator.geolocation) {
      setError("이 기기에서는 GPS를 사용할 수 없습니다.");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => setSnapshot((current) => ({
        ...current,
        capturedAt: new Date().toISOString(),
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
  }, [onOrientation, updateBattery]);

  const stop = useCallback(() => {
    window.removeEventListener("deviceorientation", onOrientation, true);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    battery.current?.removeEventListener("levelchange", updateBattery);
    battery.current?.removeEventListener("chargingchange", updateBattery);
    battery.current = null;
  }, [onOrientation, updateBattery]);

  useEffect(() => stop, [stop]);
  return { snapshot, error, start, stop };
}
