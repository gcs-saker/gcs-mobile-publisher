import type { AuthenticatedDevice } from "../contracts/authentication";

export type AuthenticationStatus =
  | "restoring"
  | "signedOut"
  | "submitting"
  | "authenticated"
  | "error";

export interface AuthenticationState {
  message: string;
  session: AuthenticatedDevice | null;
  status: AuthenticationStatus;
}

export interface AuthenticationStore {
  getSnapshot(): AuthenticationState;
  reset(): void;
  setState(
    update:
      | Partial<AuthenticationState>
      | ((state: AuthenticationState) => Partial<AuthenticationState>),
  ): void;
  subscribe(listener: () => void): () => void;
}

export const INITIAL_AUTHENTICATION_STATE: AuthenticationState = {
  message: "",
  session: null,
  status: "restoring",
};

export function createAuthenticationStore(
  initialState: AuthenticationState = INITIAL_AUTHENTICATION_STATE,
): AuthenticationStore {
  let state = { ...initialState };
  const initial = { ...initialState };
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    reset() {
      state = { ...initial };
      listeners.forEach((listener) => listener());
    },
    setState(update) {
      const patch = typeof update === "function" ? update(state) : update;
      const next = { ...state, ...patch };
      if (
        Object.keys(patch).every((key) =>
          Object.is(
            state[key as keyof AuthenticationState],
            next[key as keyof AuthenticationState],
          ))
      ) {
        return;
      }
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
