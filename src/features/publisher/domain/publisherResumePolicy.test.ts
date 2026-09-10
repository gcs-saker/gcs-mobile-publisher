import { describe, expect, it } from "vitest";
import type { PublishSession } from "../../../types";
import { decidePublisherResume } from "./publisherResumePolicy";

function session(renewalTokenExpiresAt: string): PublishSession {
  return {
    iceServers: [],
    publishToken: "publish",
    publishTokenExpiresAt: "2026-08-18T01:00:00Z",
    publishUrl: "/whip",
    renewalToken: "renewal",
    renewalTokenExpiresAt,
    sessionId: "session-1",
    streamId: "raw.mobile.front",
  };
}

describe("decidePublisherResume", () => {
  const now = Date.parse("2026-08-18T00:30:00Z");

  it("renews a session whose renewal credential is still valid", () => {
    expect(decidePublisherResume(session("2026-08-18T02:00:00Z"), now)).toBe("renew");
  });

  it("reconnects when the session is missing, expired, or malformed", () => {
    expect(decidePublisherResume(null, now)).toBe("reconnect");
    expect(decidePublisherResume(session("2026-08-18T00:29:59Z"), now)).toBe("reconnect");
    expect(decidePublisherResume(session("invalid"), now)).toBe("reconnect");
  });
});
