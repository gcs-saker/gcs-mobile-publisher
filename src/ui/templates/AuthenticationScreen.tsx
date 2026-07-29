import type { useAuthentication } from "../../features/auth/hooks/useAuthentication";
import { AccountAuthenticationForm } from "../molecules/AccountAuthenticationForm";

export interface AuthenticationScreenProps {
  controller: ReturnType<typeof useAuthentication>;
}

export function AuthenticationScreen({ controller }: AuthenticationScreenProps) {
  const restoring = controller.status === "restoring";
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-busy={restoring}>
        <div className="auth-brand">GCS FIELD</div>
        <h1>모바일 송출 로그인</h1>
        <p>기존 GCS 계정으로 로그인하거나 운영 서버에서 발급한 등록 코드로 가입하세요.</p>
        {restoring ? (
          <div className="auth-progress" role="status">로그인 상태 확인 중…</div>
        ) : (
          <AccountAuthenticationForm
            disabled={controller.status === "submitting"}
            onLogin={controller.login}
            onSignup={controller.signup}
          />
        )}
        {controller.message ? (
          <p
            className={controller.status === "error" ? "message message--error" : "message"}
            role={controller.status === "error" ? "alert" : "status"}
          >
            {controller.message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
