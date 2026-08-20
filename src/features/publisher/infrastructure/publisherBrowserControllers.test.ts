import { describe, expect, it, vi } from "vitest";
import type { PublisherGateway } from "../contracts/publisherGateway";
import { PublisherConnectionCoordinator } from "../application/PublisherConnectionCoordinator";
import { MediaCaptureController } from "./MediaCaptureController";
import { WakeLockController } from "./WakeLockController";

describe("publisher browser resource controllers", () => {
  it("owns captured media and stops every track", async () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
      getAudioTracks: () => [],
    } as unknown as MediaStream;
    const devices = { getUserMedia: vi.fn().mockResolvedValue(stream) } as unknown as MediaDevices;
    const controller = new MediaCaptureController();

    expect(await controller.capture(devices, "environment")).toBe(stream);
    expect(devices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      video: expect.objectContaining({ facingMode: { ideal: "environment" } }),
    }));
    expect(controller.stream).toBe(stream);
    controller.stop();

    expect(stop).toHaveBeenCalledOnce();
    expect(controller.stream).toBeNull();
  });

  it("stops a media stream that resolves after capture cancellation", async () => {
    let resolveCapture: ((stream: MediaStream) => void) | undefined;
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const devices = {
      getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { resolveCapture = resolve; })),
    } as unknown as MediaDevices;
    const controller = new MediaCaptureController();

    const capture = controller.capture(devices, "environment");
    controller.stop();
    resolveCapture?.(stream);

    await expect(capture).rejects.toMatchObject({ name: "AbortError" });
    expect(stop).toHaveBeenCalledOnce();
    expect(controller.stream).toBeNull();
  });

  it("requests the user-facing camera when selected", async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const controller = new MediaCaptureController();

    await controller.capture({ getUserMedia } as unknown as MediaDevices, "user");

    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      video: expect.objectContaining({ facingMode: { ideal: "user" } }),
    }));
  });

  it("releases the active mobile camera before requesting its replacement", async () => {
    const stopPrevious = vi.fn();
    const stopNext = vi.fn();
    const previousTrack = { kind: "video", stop: stopPrevious } as unknown as MediaStreamTrack;
    const nextTrack = { kind: "video", stop: stopNext } as unknown as MediaStreamTrack;
    const removeTrack = vi.fn();
    const addTrack = vi.fn();
    const activeStream = {
      addTrack,
      getAudioTracks: () => [],
      getTracks: () => [previousTrack],
      getVideoTracks: () => [previousTrack],
      removeTrack,
    } as unknown as MediaStream;
    const candidate = {
      getTracks: () => [nextTrack],
      getVideoTracks: () => [nextTrack],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(activeStream)
      .mockImplementationOnce(async () => {
        expect(stopPrevious).toHaveBeenCalledOnce();
        return candidate;
      });
    const devices = { getUserMedia } as unknown as MediaDevices;
    const replaceTrack = vi.fn().mockResolvedValue(undefined);
    const controller = new MediaCaptureController();
    await controller.capture(devices, "environment");

    await controller.switchCamera(devices, "user", replaceTrack);

    expect(replaceTrack).toHaveBeenCalledWith(nextTrack);
    expect(removeTrack).toHaveBeenCalledWith(previousTrack);
    expect(stopPrevious).toHaveBeenCalledOnce();
    expect(addTrack).toHaveBeenCalledWith(nextTrack);
    expect(stopNext).not.toHaveBeenCalled();
  });

  it("stops the rejected candidate when live track replacement fails", async () => {
    const stopPrevious = vi.fn();
    const stopNext = vi.fn();
    const previousTrack = { kind: "video", stop: stopPrevious } as unknown as MediaStreamTrack;
    const nextTrack = { kind: "video", stop: stopNext } as unknown as MediaStreamTrack;
    const activeStream = {
      addTrack: vi.fn(), getAudioTracks: () => [], getTracks: () => [previousTrack],
      getVideoTracks: () => [previousTrack], removeTrack: vi.fn(),
    } as unknown as MediaStream;
    const candidate = { getTracks: () => [nextTrack], getVideoTracks: () => [nextTrack] } as unknown as MediaStream;
    const devices = { getUserMedia: vi.fn()
      .mockResolvedValueOnce(activeStream)
      .mockResolvedValueOnce(candidate) } as unknown as MediaDevices;
    const controller = new MediaCaptureController();
    await controller.capture(devices, "environment");

    await expect(controller.switchCamera(devices, "user", async () => {
      throw new Error("replace failed");
    })).rejects.toThrow("replace failed");

    expect(stopNext).toHaveBeenCalledOnce();
    expect(stopPrevious).toHaveBeenCalledOnce();
  });

  it("releases connection and publish session exactly once", async () => {
    const close = vi.fn();
    const end = vi.fn().mockResolvedValue(undefined);
    const gateway = { end } as unknown as PublisherGateway;
    const session = { sessionId: "session-1" } as never;
    const coordinator = new PublisherConnectionCoordinator();
    coordinator.replaceConnection({ close } as unknown as RTCPeerConnection);
    coordinator.replaceSession(session);

    await coordinator.release(gateway);
    await coordinator.release(gateway);

    expect(close).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it("releases an existing wake lock before acquiring its replacement", async () => {
    const releaseFirst = vi.fn().mockResolvedValue(undefined);
    const releaseSecond = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn()
      .mockResolvedValueOnce({ release: releaseFirst })
      .mockResolvedValueOnce({ release: releaseSecond });
    const controller = new WakeLockController();

    await controller.acquire({ request });
    await controller.acquire({ request });
    await controller.release();

    expect(releaseFirst).toHaveBeenCalledOnce();
    expect(releaseSecond).toHaveBeenCalledOnce();
  });

  it("releases a wake lock that resolves after cancellation", async () => {
    let resolveRequest: ((lock: WakeLockSentinel) => void) | undefined;
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn(() => new Promise<WakeLockSentinel>((resolve) => { resolveRequest = resolve; }));
    const controller = new WakeLockController();

    const acquire = controller.acquire({ request });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await controller.release();
    resolveRequest?.({ release } as unknown as WakeLockSentinel);
    await acquire;

    expect(release).toHaveBeenCalledOnce();
  });
});
