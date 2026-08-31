import { describe, expect, it } from "vitest";
import type { PublisherStatus } from "../types";
import { isPublisherMediaControlReady, publisherStatusView } from "./publisherViewModel";

const EXPECTED_ACTIONS: Readonly<Record<PublisherStatus, string>> = {
  idle: "prepare",
  requesting: "stop",
  preview: "publish",
  authorizing: "stop",
  connecting: "stop",
  live: "stop",
  reconnecting: "stop",
  error: "prepare",
};

describe("publisherStatusView", () => {
  it.each(Object.entries(EXPECTED_ACTIONS))(
    "maps %s to its accessible primary action",
    (status, action) => {
      const view = publisherStatusView(status as PublisherStatus);
      expect(view.label.length).toBeGreaterThan(0);
      expect(view.primaryAction.action).toBe(action);
      expect(view.primaryAction.label.length).toBeGreaterThan(0);
    },
  );
});

describe("isPublisherMediaControlReady", () => {
  it("unlocks media controls only after WHIP is live", () => {
    expect(isPublisherMediaControlReady("connecting", true)).toBe(false);
    expect(isPublisherMediaControlReady("reconnecting", true)).toBe(false);
    expect(isPublisherMediaControlReady("live", true)).toBe(true);
    expect(isPublisherMediaControlReady("live", false)).toBe(false);
  });
});
