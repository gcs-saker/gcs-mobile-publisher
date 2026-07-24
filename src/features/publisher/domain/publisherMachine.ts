import type { PublisherStatus } from "../../../types";

export interface PublisherMachineState {
  generation: number;
  status: PublisherStatus;
}

interface GenerationEvent {
  generation: number;
}

export type PublisherEvent =
  | { type: "PREPARE_REQUESTED" }
  | ({ type: "PREVIEW_READY" } & GenerationEvent)
  | ({ type: "PUBLISH_REQUESTED" } & GenerationEvent)
  | ({ type: "AUTHORIZED" } & GenerationEvent)
  | ({ type: "CONNECTED" } & GenerationEvent)
  | ({ type: "CONNECTION_LOST" } & GenerationEvent)
  | ({ type: "RETRY_REQUESTED" } & GenerationEvent)
  | ({ type: "FAILED" } & GenerationEvent)
  | { type: "STOPPED" };

export interface AcceptedTransition {
  accepted: true;
  state: PublisherMachineState;
}

export interface RejectedTransition {
  accepted: false;
  reason: "invalid-transition" | "stale-generation";
  state: PublisherMachineState;
}

export type PublisherTransition = AcceptedTransition | RejectedTransition;

function accepted(state: PublisherMachineState): AcceptedTransition {
  return { accepted: true, state };
}

function rejected(
  state: PublisherMachineState,
  reason: RejectedTransition["reason"],
): RejectedTransition {
  return { accepted: false, reason, state };
}

function hasCurrentGeneration(
  state: PublisherMachineState,
  event: GenerationEvent,
): boolean {
  return state.generation === event.generation;
}

export function transitionPublisher(
  state: PublisherMachineState,
  event: PublisherEvent,
): PublisherTransition {
  if (event.type === "STOPPED") {
    return accepted({ generation: state.generation + 1, status: "idle" });
  }
  if (event.type === "PREPARE_REQUESTED") {
    if (state.status !== "idle" && state.status !== "error") {
      return rejected(state, "invalid-transition");
    }
    return accepted({ generation: state.generation + 1, status: "requesting" });
  }
  if (!hasCurrentGeneration(state, event)) {
    return rejected(state, "stale-generation");
  }

  switch (event.type) {
    case "PREVIEW_READY":
      return state.status === "requesting"
        ? accepted({ ...state, status: "preview" })
        : rejected(state, "invalid-transition");
    case "PUBLISH_REQUESTED":
      return state.status === "preview" || state.status === "reconnecting"
        ? accepted({ ...state, status: "authorizing" })
        : rejected(state, "invalid-transition");
    case "AUTHORIZED":
      return state.status === "authorizing"
        ? accepted({ ...state, status: "connecting" })
        : rejected(state, "invalid-transition");
    case "CONNECTED":
      return state.status === "connecting"
        ? accepted({ ...state, status: "live" })
        : rejected(state, "invalid-transition");
    case "CONNECTION_LOST":
      return state.status === "live"
        || state.status === "connecting"
        || state.status === "authorizing"
        ? accepted({ ...state, status: "reconnecting" })
        : rejected(state, "invalid-transition");
    case "RETRY_REQUESTED":
      return state.status === "reconnecting"
        ? accepted({ ...state, status: "authorizing" })
        : rejected(state, "invalid-transition");
    case "FAILED":
      return state.status === "requesting"
        || state.status === "authorizing"
        || state.status === "connecting"
        || state.status === "reconnecting"
        ? accepted({ ...state, status: "error" })
        : rejected(state, "invalid-transition");
  }
}
