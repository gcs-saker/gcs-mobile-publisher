import { describe, expect, it, vi } from "vitest";
import { createPublisherStore, type PublisherState } from "./publisherStore";

const initialState: PublisherState = {
  generation: 0,
  isOnline: true,
  mediaReady: false,
  message: "ready",
  muted: false,
  quality: "high",
  status: "idle",
  streamId: "CID001",
  token: "",
};

describe("publisherStore", () => {
  it("notifies subscribers for a state transition", () => {
    const store = createPublisherStore(initialState);
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ status: "requesting", message: "permission" });

    expect(store.getSnapshot()).toMatchObject({
      status: "requesting",
      message: "permission",
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("supports transitions based on the current state", () => {
    const store = createPublisherStore(initialState);
    store.setState((state) => ({ muted: !state.muted }));
    expect(store.getSnapshot().muted).toBe(true);
  });

  it("does not notify for an unchanged patch", () => {
    const store = createPublisherStore(initialState);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ status: "idle" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("resets to a copy of the initial state", () => {
    const store = createPublisherStore(initialState);
    store.setState({ streamId: "CID999", status: "live" });
    store.reset();
    expect(store.getSnapshot()).toEqual(initialState);
  });
});
