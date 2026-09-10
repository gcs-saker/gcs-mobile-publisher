import { useCallback } from "react";
import type { PublisherStore } from "../application/publisherStore";
import {
  transitionPublisher,
  type PublisherEvent,
  type PublisherTransition,
} from "../domain/publisherMachine";

export function usePublisherTransition(store: PublisherStore) {
  return useCallback((event: PublisherEvent): PublisherTransition => {
    const current = store.getSnapshot();
    const result = transitionPublisher(
      { generation: current.generation, status: current.status },
      event,
    );
    if (result.accepted) {
      store.setState({
        generation: result.state.generation,
        status: result.state.status,
      });
    }
    return result;
  }, [store]);
}
