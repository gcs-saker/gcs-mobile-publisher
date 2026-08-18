import type { CameraFacingMode } from "../domain/publisherSettings";

function captureConstraints(facingMode: CameraFacingMode): MediaStreamConstraints {
  return { video: {
    facingMode: { ideal: facingMode },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  } };
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
