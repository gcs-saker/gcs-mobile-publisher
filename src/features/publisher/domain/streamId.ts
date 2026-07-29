const streamSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export interface ValidStreamId {
  valid: true;
}

export interface InvalidStreamId {
  valid: false;
  message: string;
}

export type StreamIdValidation = ValidStreamId | InvalidStreamId;

export function validatePublishStreamId(value: string): StreamIdValidation {
  const segments = value.trim().split(".");
  if (
    segments.length !== 3
    || segments[0] !== "raw"
    || segments.some((segment) => !streamSegmentPattern.test(segment))
  ) {
    return {
      valid: false,
      message: "스트림 ID는 raw.{장비}.{센서} 형식으로 입력하세요. 예: raw.mobile.front",
    };
  }
  return { valid: true };
}
