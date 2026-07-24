import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRuntime } from "../../../app/RuntimeProvider";
import { config } from "../../../config";
import {
  createPublisherStore,
  type PublisherState,
  type PublisherStore,
} from "./publisherStore";

const PublisherStoreContext = createContext<PublisherStore | null>(null);

export interface PublisherStoreProviderProps extends PropsWithChildren {
  store?: PublisherStore;
}

export function PublisherStoreProvider({ children, store }: PublisherStoreProviderProps) {
  const runtime = useRuntime();
  const storeRef = useRef<PublisherStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store ?? createPublisherStore({
      generation: 0,
      isOnline: runtime.network.online,
      mediaReady: false,
      message: "송출 준비를 눌러 카메라와 센서를 시작하세요.",
      muted: false,
      quality: "high",
      status: "idle",
      streamId: config.defaultStreamId,
      token: runtime.sessionStore.get("gcs.accessToken") || "",
    });
  }
  return (
    <PublisherStoreContext.Provider value={storeRef.current}>
      {children}
    </PublisherStoreContext.Provider>
  );
}

export function usePublisherStoreApi(): PublisherStore {
  const store = useContext(PublisherStoreContext);
  if (!store) throw new Error("PublisherStoreProvider is required");
  return store;
}

export function usePublisherStore<T>(selector: (state: PublisherState) => T): T {
  const store = usePublisherStoreApi();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  );
}
