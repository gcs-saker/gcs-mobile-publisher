import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRuntime } from "../../../app/RuntimeProvider";
import { config } from "../../../config";
import { HttpAuthenticationGateway } from "../infrastructure/HttpAuthenticationGateway";
import { MemoryAuthSessionRepository } from "../infrastructure/MemoryAuthSessionRepository";
import { AuthSessionManager } from "./AuthSessionManager";
import {
  createAuthenticationStore,
  type AuthenticationState,
  type AuthenticationStore,
} from "./authStore";

export interface AuthenticationDependencies {
  manager: AuthSessionManager;
  store: AuthenticationStore;
}

const AuthenticationContext = createContext<AuthenticationDependencies | null>(null);

export interface AuthenticationProviderProps extends PropsWithChildren {
  dependencies?: AuthenticationDependencies;
}

export function AuthenticationProvider({
  children,
  dependencies,
}: AuthenticationProviderProps) {
  const runtime = useRuntime();
  const storeRef = useRef<AuthenticationStore | null>(null);
  storeRef.current ??= dependencies?.store ?? createAuthenticationStore();
  const authenticationStore = storeRef.current;
  const value = useMemo<AuthenticationDependencies>(() => ({
    manager: dependencies?.manager ?? new AuthSessionManager(
      new HttpAuthenticationGateway(
        {
          baseUrl: config.authApiBaseUrl,
          now: runtime.clock.now,
        },
        runtime.fetch,
      ),
      new MemoryAuthSessionRepository(),
      runtime.clock,
      { refreshLeewayMs: 60_000 },
    ),
    store: authenticationStore,
  }), [authenticationStore, dependencies, runtime]);

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthenticationDependencies(): AuthenticationDependencies {
  const dependencies = useContext(AuthenticationContext);
  if (!dependencies) throw new Error("AuthenticationProvider is required");
  return dependencies;
}

export function useAuthenticationStore<T>(
  selector: (state: AuthenticationState) => T,
): T {
  const { store } = useAuthenticationDependencies();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  );
}
