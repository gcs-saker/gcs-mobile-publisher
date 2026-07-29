import { useCallback, useEffect } from "react";
import type {
  LoginRequest,
  SignupRequest,
} from "../contracts/authentication";
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

  const login = useCallback(async (request: LoginRequest): Promise<boolean> => {
    store.setState({ message: "", status: "submitting" });
    try {
      const session = await manager.login(request);
      store.setState({ session, status: "authenticated" });
      return true;
    } catch (reason) {
      store.setState({
        message: messageFrom(reason),
        session: null,
        status: "error",
      });
      return false;
    }
  }, [manager, store]);

  const signup = useCallback(async (request: SignupRequest): Promise<boolean> => {
    store.setState({ message: "", status: "submitting" });
    try {
      await manager.signup(request);
      store.setState({
        message: "회원가입이 완료되었습니다. 로그인해 주세요.",
        session: null,
        status: "signedOut",
      });
      return true;
    } catch (reason) {
      store.setState({
        message: messageFrom(reason),
        session: null,
        status: "error",
      });
      return false;
    }
  }, [manager, store]);

  const logout = useCallback(async () => {
    try {
      await manager.logout();
    } catch {
      // Memory credentials are cleared by the manager even when logout fails remotely.
    }
    store.setState({ message: "", session: null, status: "signedOut" });
  }, [manager, store]);

  return {
    accessToken: state.session?.accessToken ?? null,
    login,
    logout,
    message: state.message,
    signup,
    status: state.status,
    username: state.session?.username ?? null,
  } as const;
}
