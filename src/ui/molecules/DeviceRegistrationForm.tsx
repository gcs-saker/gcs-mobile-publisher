import { useState, type FormEvent } from "react";
import type { DeviceRegistrationRequest } from "../../features/auth/contracts/authentication";

export interface DeviceRegistrationFormProps {
  disabled: boolean;
  onSubmit(request: DeviceRegistrationRequest): Promise<void>;
}

export function DeviceRegistrationForm({
  disabled,
  onSubmit,
}: DeviceRegistrationFormProps) {
  const [deviceName, setDeviceName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({
      deviceName: deviceName.trim(),
      registrationCode: registrationCode.trim(),
    });
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>기기 이름</span>
        <input
          autoComplete="off"
          disabled={disabled}
          maxLength={60}
          onChange={(event) => setDeviceName(event.target.value)}
          placeholder="예: 현장 Pixel 9"
          required
          value={deviceName}
        />
      </label>
      <label>
        <span>등록 코드</span>
        <input
          autoCapitalize="characters"
          autoComplete="one-time-code"
          disabled={disabled}
          maxLength={32}
          onChange={(event) => setRegistrationCode(event.target.value)}
          placeholder="관리자에게 받은 코드"
          required
          value={registrationCode}
        />
      </label>
      <button className="button" disabled={disabled} type="submit">
        {disabled ? "기기 등록 중…" : "기기 등록"}
      </button>
    </form>
  );
}
