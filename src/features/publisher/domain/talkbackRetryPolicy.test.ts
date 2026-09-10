import { describe, expect, test } from "vitest";
import { talkbackRetryDelayMs } from "./talkbackRetryPolicy";

describe("talkbackRetryDelayMs", () => {
  test("keeps polling quickly for the entire live publishing session", () => {
    expect(talkbackRetryDelayMs(true)).toBe(750);
    expect(talkbackRetryDelayMs(true)).toBe(750);
  });

  test("stops polling after publishing ends", () => {
    expect(talkbackRetryDelayMs(false)).toBeNull();
  });
});
