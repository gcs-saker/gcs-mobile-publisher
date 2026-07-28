import type { SensorSnapshot } from "../../types";

export interface BatteryStatusProps {
  battery: SensorSnapshot["battery"];
}

export function BatteryStatus({ battery }: BatteryStatusProps) {
  const text = battery.supported && battery.level !== null
    ? `${Math.round(battery.level * 100)}%${battery.charging ? " · 충전" : ""}`
    : "지원 안 됨";
  return <div className="battery" aria-label="배터리 상태">{text}</div>;
}
