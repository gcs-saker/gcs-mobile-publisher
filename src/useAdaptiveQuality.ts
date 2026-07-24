import { useEffect, useState } from "react";
import {
  applyVideoQuality,
  readConnectionHealth,
  selectQuality,
  type VideoQuality,
} from "./quality";

export function useAdaptiveQuality(
  pc: RTCPeerConnection | null,
  media: MediaStream | null,
  active: boolean,
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
    const id = window.setInterval(() => void inspect(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, media, pc, quality]);

  return quality;
}
