import type { RefObject } from "react";

interface TalkbackPlaybackProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  onResume: () => Promise<void>;
  status: string;
}

export function TalkbackPlayback({ audioRef, onResume, status }: TalkbackPlaybackProps) {
  return (
    <>
      <audio ref={audioRef} autoPlay className="publisher-talkback__audio" />
      {status === "관제 음성 수신 중" ? (
        <div className="publisher-talkback" aria-live="polite">
          <span>{status}</span>
        </div>
      ) : null}
      {status === "음성 재생 허용 필요" ? (
        <button className="publisher-talkback" type="button" onClick={() => void onResume()}>
          관제 음성 재생
        </button>
      ) : null}
    </>
  );
}
