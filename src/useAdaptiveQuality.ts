import { useEffect, useRef, useState } from "react";
import {
  applyVideoQuality,
  readConnectionHealth,
  selectQuality,
  shouldApplyQuality,
  type VideoQuality,
} from "./quality";
import type { Scheduler } from "./app/ports";

export function useAdaptiveQuality(
  pc: RTCPeerConnection | null,
  media: MediaStream | null,
  active: boolean,
  scheduler: Scheduler,
) {
  const [quality, setQuality] = useState<VideoQuality>("medium");
  const qualityRef = useRef<VideoQuality>("medium");

  useEffect(() => {
    if (!pc || !media || !active) return;
    let cancelled = false;
    let previousPacketsLost: number | null = null;
    let consecutiveHealthySamples = 0;
    const inspect = async () => {
      try {
        const health = await readConnectionHealth(pc);
        const packetLossDelta = previousPacketsLost === null
          ? 0
          : Math.max(0, health.packetsLost - previousPacketsLost);
        previousPacketsLost = health.packetsLost;
        const next = selectQuality(health.availableOutgoingBitrate, packetLossDelta);
        consecutiveHealthySamples = next === "high" ? consecutiveHealthySamples + 1 : 0;
        if (cancelled || next === qualityRef.current) return;
        if (!shouldApplyQuality(qualityRef.current, next, consecutiveHealthySamples)) return;
        await applyVideoQuality(pc, media, next);
        if (!cancelled) {
          qualityRef.current = next;
          setQuality(next);
        }
      } catch {
        // Stats and sender parameter support varies; keep the current profile.
      }
    };
    void applyVideoQuality(pc, media, qualityRef.current).catch(() => undefined);
    void inspect();
    const id = scheduler.setInterval(() => void inspect(), 3_000);
    return () => {
      cancelled = true;
      scheduler.clearInterval(id);
    };
  }, [active, media, pc, scheduler]);

  return quality;
}
