import type { PublisherStatus } from "../../../types";
import type { VideoQuality } from "../../../quality";

export interface PublisherState {
  generation: number;
  isOnline: boolean;
  mediaReady: boolean;
  message: string;
  muted: boolean;
  quality: VideoQuality;
  status: PublisherStatus;
  streamId: string;
}

export interface PublisherStore {
  getSnapshot(): PublisherState;
  setState(update: Partial<PublisherState> | ((state: PublisherState) => Partial<PublisherState>)): void;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

export function createPublisherStore(initialState: PublisherState): PublisherStore {
  let state = { ...initialState };
  const initial = { ...initialState };
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    setState(update) {
      const patch = typeof update === "function" ? update(state) : update;
      const next = { ...state, ...patch };
      if (Object.keys(patch).every((key) =>
        Object.is(state[key as keyof PublisherState], next[key as keyof PublisherState]))) {
        return;
      }
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      state = { ...initial };
      listeners.forEach((listener) => listener());
    },
  };
}
