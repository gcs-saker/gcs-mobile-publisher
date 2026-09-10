export type VideoQuality = "high" | "medium" | "low";

export interface QualityProfile {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
}

export const QUALITY_PROFILES: Record<VideoQuality, QualityProfile> = {
  high: { width: 1280, height: 720, frameRate: 20, maxBitrate: 1_800_000 },
  medium: { width: 960, height: 540, frameRate: 18, maxBitrate: 1_100_000 },
  low: { width: 640, height: 360, frameRate: 12, maxBitrate: 450_000 },
};

export function selectQuality(
  availableOutgoingBitrate: number | null,
  packetLossDelta: number,
): VideoQuality {
  if (availableOutgoingBitrate !== null && availableOutgoingBitrate < 650_000) return "low";
  if (packetLossDelta >= 5) return "low";
  if (availableOutgoingBitrate === null) return "medium";
  if (availableOutgoingBitrate !== null && availableOutgoingBitrate < 1_500_000) return "medium";
  if (packetLossDelta >= 2) return "medium";
  return "high";
}

export function shouldApplyQuality(
  current: VideoQuality,
  recommended: VideoQuality,
  consecutiveHealthySamples: number,
): boolean {
  const rank: Record<VideoQuality, number> = { low: 0, medium: 1, high: 2 };
  if (rank[recommended] < rank[current]) return true;
  return rank[recommended] > rank[current] && consecutiveHealthySamples >= 6;
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
  const [encoding] = parameters.encodings;
  if (!encoding) return;
  encoding.maxBitrate = profile.maxBitrate;
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
