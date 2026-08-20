import type { CameraFacingMode } from "../domain/publisherSettings";

function videoConstraints(facingMode: CameraFacingMode): MediaTrackConstraints {
  return {
    facingMode: { ideal: facingMode },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 },
  };
}

function captureConstraints(facingMode: CameraFacingMode): MediaStreamConstraints {
  return { video: videoConstraints(facingMode),
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  } };
}

function videoOnlyConstraints(facingMode: CameraFacingMode): MediaStreamConstraints {
  return { video: videoConstraints(facingMode), audio: false };
}

function stopTracks(tracks: MediaStreamTrack[]): void {
  tracks.forEach((track) => track.stop());
}

export class MediaCaptureController {
  private activeStream: MediaStream | null = null;
  private generation = 0;

  get stream(): MediaStream | null {
    return this.activeStream;
  }

  async capture(devices: MediaDevices | null, facingMode: CameraFacingMode): Promise<MediaStream> {
    if (!devices) throw new Error("이 장치에서는 카메라를 사용할 수 없습니다.");
    this.stop();
    const generation = ++this.generation;
    const stream = await devices.getUserMedia(captureConstraints(facingMode));
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Media capture was cancelled", "AbortError");
    }
    this.activeStream = stream;
    return stream;
  }

  async switchCamera(
    devices: MediaDevices | null,
    facingMode: CameraFacingMode,
    replaceTrack: (track: MediaStreamTrack) => Promise<void>,
  ): Promise<void> {
    if (!devices || !this.activeStream) throw new Error("카메라 전환 준비가 되지 않았습니다.");
    const generation = ++this.generation;
    const previousTracks = this.activeStream.getVideoTracks();
    stopTracks(previousTracks);
    const candidate = await devices.getUserMedia(videoOnlyConstraints(facingMode));
    const nextTrack = candidate.getVideoTracks()[0];
    if (!nextTrack) {
      stopTracks(candidate.getTracks());
      throw new Error("선택한 카메라의 영상 트랙을 가져오지 못했습니다.");
    }
    if (generation !== this.generation || !this.activeStream) {
      stopTracks(candidate.getTracks());
      throw new DOMException("Camera switch was cancelled", "AbortError");
    }
    try {
      await replaceTrack(nextTrack);
    } catch (error: unknown) {
      stopTracks(candidate.getTracks());
      throw error;
    }
    previousTracks.forEach((track) => {
      this.activeStream?.removeTrack(track);
    });
    this.activeStream.addTrack(nextTrack);
  }

  attach(video: HTMLVideoElement | null): void {
    if (video) video.srcObject = this.activeStream;
  }

  setMuted(muted: boolean): void {
    this.activeStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  stop(video?: HTMLVideoElement | null): void {
    this.generation += 1;
    this.activeStream?.getTracks().forEach((track) => track.stop());
    this.activeStream = null;
    if (video) video.srcObject = null;
  }
}
