import { describe, expect, it, vi } from "vitest";
import type { PeerConnectionFactory, Scheduler } from "../../../app/ports";
import { createTalkbackWhepSession } from "./talkbackWhepSession";

function scheduler(): Scheduler {
  return {
    clearInterval: vi.fn(), clearTimeout: vi.fn(),
    setInterval: vi.fn(() => 1), setTimeout: vi.fn(() => 2),
  };
}

describe("createTalkbackWhepSession", () => {
  it("publishes the gathered SDP with the session TURN configuration", async () => {
    const connection = {
      addTransceiver: vi.fn(),
      close: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-without-candidates" }),
      iceGatheringState: "complete",
      localDescription: { type: "offer", sdp: "offer-with-gathered-candidates" },
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    } as unknown as RTCPeerConnection;
    const peerConnections: PeerConnectionFactory = { create: vi.fn(() => connection) };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("answer-sdp", { status: 201 }));
    const iceServers = [{ urls: "turn:relay.example:3478", username: "short", credential: "secret" }];

    await createTalkbackWhepSession({
      audio: null, fetcher, iceServers, onPlaybackState: vi.fn(),
      peerConnections, scheduler: scheduler(), url: "/talkback/whep",
    });

    expect(peerConnections.create).toHaveBeenCalledWith({ iceServers });
    expect(connection.addTransceiver).toHaveBeenCalledWith("audio", { direction: "recvonly" });
    expect(fetcher).toHaveBeenCalledWith("/talkback/whep", expect.objectContaining({
      body: "offer-with-gathered-candidates",
    }));
  });

  it("reports an autoplay block instead of claiming audible playback", async () => {
    const play = vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const audio = { play, srcObject: null } as unknown as HTMLAudioElement;
    const connection = {
      addTransceiver: vi.fn(), close: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "offer" }),
      iceGatheringState: "complete", localDescription: { type: "offer", sdp: "offer" },
      ontrack: null,
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    } as unknown as RTCPeerConnection;
    const onPlaybackState = vi.fn();

    await createTalkbackWhepSession({
      audio, fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("answer", { status: 201 })),
      iceServers: [], onPlaybackState,
      peerConnections: { create: () => connection }, scheduler: scheduler(), url: "/talkback/whep",
    });
    connection.ontrack?.({
      streams: [{} as MediaStream], track: {} as MediaStreamTrack,
    } as unknown as RTCTrackEvent);
    await Promise.resolve();

    expect(play).toHaveBeenCalledOnce();
    expect(onPlaybackState).toHaveBeenCalledWith("음성 재생 허용 필요");
  });
});
