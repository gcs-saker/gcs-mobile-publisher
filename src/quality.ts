export type VideoQuality = "high" | "medium" | "low";

export interface QualityProfile {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
}

export const QUALITY_PROFILES: Record<VideoQuality, QualityProfile> = {
  high: { width: 1280, height: 720, frameRate: 24, maxBitrate: 2_500_000 },
  medium: { width: 960, height: 540, frameRate: 20, maxBitrate: 1_400_000 },
  low: { width: 640, height: 360, frameRate: 15, maxBitrate: 700_000 },
};

export function selectQuality(
  availableOutgoingBitrate: number | null,
  packetsLost: number,
): VideoQuality {
  if (availableOutgoingBitrate !== null && availableOutgoingBitrate < 900_000) return "low";
  if (availableOutgoingBitrate !== null && availableOutgoingBitrate < 1_800_000) return "medium";
  if (packetsLost >= 25) return "low";
  if (packetsLost >= 8) return "medium";
  return "high";
}

export async function applyVideoQuality(
  pc: RTCPeerConnection,
  media: MediaStream,
  quality: VideoQuality,
): Promise<void> {
  const profile = QUALITY_PROFILES[quality];
  const track = media.getVideoTracks()[0];
  if (track) {
    await track.applyConstraints({
      width: { ideal: profile.width },
      height: { ideal: profile.height },
      frameRate: { ideal: profile.frameRate, max: profile.frameRate },
    });
  }

  const sender = pc.getSenders().find((candidate) => candidate.track?.kind === "video");
  if (!sender) return;
  const parameters = sender.getParameters();
  parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
  parameters.encodings[0].maxBitrate = profile.maxBitrate;
  await sender.setParameters(parameters);
}

export async function readConnectionHealth(pc: RTCPeerConnection): Promise<{
  availableOutgoingBitrate: number | null;
  packetsLost: number;
}> {
  const reports = await pc.getStats();
  let availableOutgoingBitrate: number | null = null;
  let packetsLost = 0;
  reports.forEach((report) => {
    if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
      availableOutgoingBitrate =
        typeof report.availableOutgoingBitrate === "number"
          ? report.availableOutgoingBitrate
          : availableOutgoingBitrate;
    }
    if (report.type === "remote-inbound-rtp" && report.kind === "video") {
      packetsLost = typeof report.packetsLost === "number" ? report.packetsLost : packetsLost;
    }
  });
  return { availableOutgoingBitrate, packetsLost };
}
