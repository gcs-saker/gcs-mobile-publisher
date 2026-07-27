import { useCallback, useEffect } from "react";
import type { DeviceRegistrationRequest } from "../contracts/authentication";
import {
  useAuthenticationDependencies,
  useAuthenticationStore,
} from "../application/AuthenticationProvider";

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : "인증 요청을 처리하지 못했습니다.";
}

export function useAuthentication() {
  const { manager, store } = useAuthenticationDependencies();
  const state = useAuthenticationStore((snapshot) => snapshot);

  useEffect(() => {
    let active = true;
    void manager.restore().then(
      (session) => {
        if (!active) return;
        store.setState({
          message: "",
          session,
          status: session ? "authenticated" : "signedOut",
        });
      },
      (reason: unknown) => {
        if (!active) return;
        store.setState({
          message: messageFrom(reason),
          session: null,
          status: "error",
        });
      },
    );
    return () => {
      active = false;
    };
  }, [manager, store]);

  const registerDevice = useCallback(async (request: DeviceRegistrationRequest) => {
    store.setState({ message: "", status: "submitting" });
    try {
      const session = await manager.registerDevice(request);
      store.setState({ session, status: "authenticated" });
    } catch (reason) {
      store.setState({
        message: messageFrom(reason),
        session: null,
        status: "error",
      });
    }
  }, [manager, store]);

  const logout = useCallback(async () => {
    try {
      await manager.logout();
    } catch {
      // Local credentials are cleared by the manager even when remote revocation fails.
    }
    store.setState({ message: "", session: null, status: "signedOut" });
  }, [manager, store]);

  return {
    accessToken: state.session?.accessToken ?? null,
    deviceId: state.session?.deviceId ?? null,
    logout,
    message: state.message,
    registerDevice,
    status: state.status,
  } as const;
}
