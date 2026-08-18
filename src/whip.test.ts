import { describe, expect, it, vi } from "vitest";
import type { PeerConnectionFactory, Scheduler } from "./app/ports";
import { createWhipSession } from "./whip";

describe("createWhipSession", () => {
  it("closes its peer connection when signaling fails", async () => {
    const close = vi.fn();
    const peerConnection = {
      addEventListener: vi.fn(),
      addTrack: vi.fn(),
      close,
      createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-sdp" }),
      iceGatheringState: "complete",
      localDescription: { type: "offer", sdp: "offer-sdp" },
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
    } as unknown as RTCPeerConnection;
    const peerConnections: PeerConnectionFactory = {
      create: vi.fn(() => peerConnection),
    };
    const scheduler = {
      clearInterval: vi.fn(), clearTimeout: vi.fn(),
      setInterval: vi.fn(() => 1), setTimeout: vi.fn(() => 2),
    } satisfies Scheduler;
    const media = { getTracks: () => [] } as unknown as MediaStream;
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable"));

    await expect(createWhipSession(
      media, "/whip", [], "publish-token", vi.fn(), fetcher, peerConnections, scheduler,
    )).rejects.toThrow("network unavailable");

    expect(close).toHaveBeenCalledOnce();
  });
});
