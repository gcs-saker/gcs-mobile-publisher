import { useEffect, useState } from "react";
import {
  applyVideoQuality,
  readConnectionHealth,
  selectQuality,
  type VideoQuality,
} from "./quality";
import type { Scheduler } from "./app/ports";

export function useAdaptiveQuality(
  pc: RTCPeerConnection | null,
  media: MediaStream | null,
  active: boolean,
  scheduler: Scheduler,
) {
  const [quality, setQuality] = useState<VideoQuality>("high");

  useEffect(() => {
    if (!pc || !media || !active) return;
    let cancelled = false;
    const inspect = async () => {
      try {
        const health = await readConnectionHealth(pc);
        const next = selectQuality(health.availableOutgoingBitrate, health.packetsLost);
        if (cancelled || next === quality) return;
        await applyVideoQuality(pc, media, next);
        if (!cancelled) setQuality(next);
      } catch {
        // Stats and sender parameter support varies; keep the current profile.
      }
    };
    const id = scheduler.setInterval(() => void inspect(), 5_000);
    return () => {
      cancelled = true;
      scheduler.clearInterval(id);
    };
  }, [active, media, pc, quality, scheduler]);

  return quality;
}
