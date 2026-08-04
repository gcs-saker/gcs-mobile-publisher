import { useCallback, useEffect } from "react";
import type { DeviceCredential, DeviceRegistrationRequest } from "../contracts/authentication";
import {
  useAuthenticationDependencies,
  useAuthenticationStore,
} from "../application/AuthenticationProvider";

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : "기기 인증 요청을 처리하지 못했습니다.";
}

export function useAuthentication() {
  const { manager, store } = useAuthenticationDependencies();
  const state = useAuthenticationStore((snapshot) => snapshot);

  useEffect(() => {
    let active = true;
    void manager.load().then((session) => {
      if (!active) return;
      store.setState({ message: "", session, status: session ? "authenticated" : "signedOut" });
    });
    return () => { active = false; };
  }, [manager, store]);

  const authenticate = useCallback(async (identity: DeviceCredential): Promise<boolean> => {
    store.setState({ message: "", status: "submitting" });
    try {
      const session = await manager.authenticate(identity);
      store.setState({ message: "", session, status: "authenticated" });
      return true;
    } catch (reason) {
      store.setState({ message: messageFrom(reason), session: null, status: "error" });
      return false;
    }
  }, [manager, store]);

  const register = useCallback(async (request: DeviceRegistrationRequest): Promise<boolean> => {
    store.setState({ message: "", status: "submitting" });
    try {
      const session = await manager.register(request);
      store.setState({ message: "", session, status: "authenticated" });
      return true;
    } catch (reason) {
      store.setState({ message: messageFrom(reason), session: null, status: "error" });
      return false;
    }
  }, [manager, store]);

  const logout = useCallback(async (): Promise<void> => {
    await manager.clear();
    store.setState({ message: "", session: null, status: "signedOut" });
  }, [manager, store]);

  return {
    authenticate,
    device: state.session,
    logout,
    message: state.message,
    register,
    status: state.status,
  } as const;
}
