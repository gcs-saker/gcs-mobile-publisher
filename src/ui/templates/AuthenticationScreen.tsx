import type { useAuthentication } from "../../features/auth/hooks/useAuthentication";
import { AccountLoginForm } from "../molecules/AccountLoginForm";

export interface AuthenticationScreenProps { controller: ReturnType<typeof useAuthentication> }

export function AuthenticationScreen({ controller }: AuthenticationScreenProps) {
  const restoring = controller.status === "restoring";
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-busy={restoring}>
        <div className="auth-brand">GCS FIELD</div>
        <h1>모바일 송출 로그인</h1>
        <p>기존 GCS 운영 계정으로 로그인하세요. 소속 그룹과 송출 경로는 서버에서 자동으로 결정합니다.</p>
        {restoring ? <div className="auth-progress" role="status">로그인 상태 확인 중…</div> : (
          <AccountLoginForm disabled={controller.status === "submitting"} onLogin={controller.login} />
        )}
        {controller.message ? <p className={controller.status === "error" ? "message message--error" : "message"}
          role={controller.status === "error" ? "alert" : "status"}>{controller.message}</p> : null}
      </section>
    </main>
  );
}
