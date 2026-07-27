import { describe, expect, it, vi } from "vitest";
import {
  createAuthenticationStore,
  INITIAL_AUTHENTICATION_STATE,
} from "./authStore";

describe("AuthenticationStore", () => {
  it("notifies subscribers only when selected state changes", () => {
    const store = createAuthenticationStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ status: "signedOut" });
    store.setState({ status: "signedOut" });

    expect(listener).toHaveBeenCalledOnce();
  });

  it("restores its initial state", () => {
    const store = createAuthenticationStore();
    store.setState({ message: "failure", status: "error" });

    store.reset();

    expect(store.getSnapshot()).toEqual(INITIAL_AUTHENTICATION_STATE);
  });
});
