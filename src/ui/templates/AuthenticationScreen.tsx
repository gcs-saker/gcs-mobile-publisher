import type { useAuthentication } from "../../features/auth/hooks/useAuthentication";
import { DeviceAuthenticationForm } from "../molecules/DeviceAuthenticationForm";

export interface AuthenticationScreenProps {
  controller: ReturnType<typeof useAuthentication>;
}

export function AuthenticationScreen({ controller }: AuthenticationScreenProps) {
  const restoring = controller.status === "restoring";
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-busy={restoring}>
        <div className="auth-brand">GCS FIELD</div>
        <h1>모바일 송출 기기</h1>
        <p>등록된 UUID와 Credential로 인증하세요. 신규 기기는 관리자가 발급한 등록 코드를 사용합니다.</p>
        {restoring ? (
          <div className="auth-progress" role="status">기기 인증 상태 확인 중…</div>
        ) : (
          <DeviceAuthenticationForm disabled={controller.status === "submitting"}
            onAuthenticate={controller.authenticate} onRegister={controller.register} />
        )}
        {controller.message ? (
          <p className={controller.status === "error" ? "message message--error" : "message"}
            role={controller.status === "error" ? "alert" : "status"}>{controller.message}</p>
        ) : null}
      </section>
    </main>
  );
}
