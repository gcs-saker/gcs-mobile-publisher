import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRuntime } from "../../../app/RuntimeProvider";
import {
  createPublisherStore,
  type PublisherState,
  type PublisherStore,
} from "./publisherStore";
import type { PublisherGateway } from "../contracts/publisherGateway";
import { HttpPublisherGateway } from "../infrastructure/HttpPublisherGateway";

export interface PublisherDependencies {
  gateway: PublisherGateway;
  store: PublisherStore;
}

const PublisherStoreContext = createContext<PublisherDependencies | null>(null);

export interface PublisherStoreProviderProps extends PropsWithChildren {
  store?: PublisherStore;
  gateway?: PublisherGateway;
}

export function PublisherStoreProvider({ children, gateway, store }: PublisherStoreProviderProps) {
  const runtime = useRuntime();
  const storeRef = useRef<PublisherStore | null>(null);
  const gatewayRef = useRef<PublisherGateway | null>(null);
  gatewayRef.current ??= gateway ?? new HttpPublisherGateway(runtime.fetch);
  if (!storeRef.current) {
    storeRef.current = store ?? createPublisherStore({
      cameraFacingMode: "environment",
      coordinatePrecision: 2,
      generation: 0,
      isOnline: runtime.network.online,
      mediaReady: false,
      message: "송출 준비를 눌러 카메라와 센서를 시작하세요.",
      muted: false,
      quality: "medium",
      status: "idle",
      streamId: "",
    });
  }
  return (
    <PublisherStoreContext.Provider value={{
      gateway: gatewayRef.current,
      store: storeRef.current,
    }}>
      {children}
    </PublisherStoreContext.Provider>
  );
}

export function usePublisherStoreApi(): PublisherStore {
  const dependencies = useContext(PublisherStoreContext);
  if (!dependencies) throw new Error("PublisherStoreProvider is required");
  return dependencies.store;
}

export function usePublisherGateway(): PublisherGateway {
  const dependencies = useContext(PublisherStoreContext);
  if (!dependencies) throw new Error("PublisherStoreProvider is required");
  return dependencies.gateway;
}

export function usePublisherStore<T>(selector: (state: PublisherState) => T): T {
  const store = usePublisherStoreApi();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  );
}
