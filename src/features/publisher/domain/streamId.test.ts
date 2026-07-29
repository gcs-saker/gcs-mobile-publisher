import { describe, expect, it } from "vitest";
import { validatePublishStreamId } from "./streamId";

describe("validatePublishStreamId", () => {
  it.each(["raw.mobile.front", "raw.drone-01.camera_1"])(
    "accepts a server-compatible raw stream id: %s",
    (streamId) => {
      expect(validatePublishStreamId(streamId)).toEqual({ valid: true });
    },
  );

  it.each(["", "CID001", "raw.mobile", "raw/mobile/front", "ai.mobile.front.detector"])(
    "rejects an unsupported publish stream id: %s",
    (streamId) => {
      expect(validatePublishStreamId(streamId).valid).toBe(false);
    },
  );
});
