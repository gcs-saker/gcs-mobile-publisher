import type { useAuthentication } from "../../features/auth/hooks/useAuthentication";
import { DeviceRegistrationForm } from "../molecules/DeviceRegistrationForm";

export interface AuthenticationScreenProps {
  controller: ReturnType<typeof useAuthentication>;
}

export function AuthenticationScreen({ controller }: AuthenticationScreenProps) {
  const restoring = controller.status === "restoring";
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-busy={restoring}>
        <div className="auth-brand">GCS FIELD</div>
        <h1>송출 기기 등록</h1>
        <p>
          Android 기기를 안전하게 등록한 후 카메라와 위치 센서를 사용할 수 있습니다.
        </p>
        {restoring ? (
          <div className="auth-progress" role="status">기기 인증 확인 중…</div>
        ) : (
          <DeviceRegistrationForm
            disabled={controller.status === "submitting"}
            onSubmit={controller.registerDevice}
          />
        )}
        {controller.message ? (
          <p className="message message--error" role="alert">{controller.message}</p>
        ) : null}
      </section>
    </main>
  );
}
