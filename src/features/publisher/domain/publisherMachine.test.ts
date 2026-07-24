import { describe, expect, it } from "vitest";
import {
  transitionPublisher,
  type PublisherEvent,
  type PublisherMachineState,
} from "./publisherMachine";

function apply(
  initial: PublisherMachineState,
  events: readonly PublisherEvent[],
): PublisherMachineState {
  return events.reduce((state, event) => {
    const result = transitionPublisher(state, event);
    expect(result.accepted).toBe(true);
    return result.state;
  }, initial);
}

describe("publisherMachine", () => {
  it("follows the normal prepare and publish path", () => {
    const state = apply(
      { generation: 0, status: "idle" },
      [
        { type: "PREPARE_REQUESTED" },
        { type: "PREVIEW_READY", generation: 1 },
        { type: "PUBLISH_REQUESTED", generation: 1 },
        { type: "AUTHORIZED", generation: 1 },
        { type: "CONNECTED", generation: 1 },
      ],
    );
    expect(state).toEqual({ generation: 1, status: "live" });
  });

  it("rejects impossible transitions without mutating state", () => {
    const state: PublisherMachineState = { generation: 2, status: "idle" };
    expect(transitionPublisher(state, {
      type: "CONNECTED",
      generation: 2,
    })).toEqual({
      accepted: false,
      reason: "invalid-transition",
      state,
    });
  });

  it("invalidates late async events after stop", () => {
    const requesting = transitionPublisher(
      { generation: 0, status: "idle" },
      { type: "PREPARE_REQUESTED" },
    ).state;
    const stopped = transitionPublisher(requesting, { type: "STOPPED" }).state;
    const latePreview = transitionPublisher(stopped, {
      type: "PREVIEW_READY",
      generation: requesting.generation,
    });

    expect(stopped).toEqual({ generation: 2, status: "idle" });
    expect(latePreview).toEqual({
      accepted: false,
      reason: "stale-generation",
      state: stopped,
    });
  });

  it("supports connection loss and retry", () => {
    const state = apply(
      { generation: 4, status: "live" },
      [
        { type: "CONNECTION_LOST", generation: 4 },
        { type: "RETRY_REQUESTED", generation: 4 },
        { type: "AUTHORIZED", generation: 4 },
        { type: "CONNECTED", generation: 4 },
      ],
    );
    expect(state.status).toBe("live");
  });

  it("increments generation for every new capture session", () => {
    const stopped = transitionPublisher(
      { generation: 3, status: "live" },
      { type: "STOPPED" },
    ).state;
    const requesting = transitionPublisher(stopped, {
      type: "PREPARE_REQUESTED",
    }).state;
    expect(requesting).toEqual({ generation: 5, status: "requesting" });
  });
});
