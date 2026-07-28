import { useState, type FormEvent } from "react";
import type { DeviceRegistrationRequest } from "../../features/auth/contracts/authentication";
import { ActionButton } from "../atoms/ActionButton";
import { TextField } from "../atoms/TextField";

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
      <TextField
        autoComplete="off"
        disabled={disabled}
        label="기기 이름"
        maxLength={60}
        name="deviceName"
        onChange={(event) => setDeviceName(event.target.value)}
        placeholder="예: 현장 Pixel 9"
        required
        value={deviceName}
      />
      <TextField
        autoCapitalize="characters"
        autoComplete="one-time-code"
        disabled={disabled}
        label="등록 코드"
        maxLength={32}
        name="registrationCode"
        onChange={(event) => setRegistrationCode(event.target.value)}
        placeholder="관리자에게 받은 코드"
        required
        value={registrationCode}
      />
      <ActionButton disabled={disabled} type="submit">
        {disabled ? "기기 등록 중…" : "기기 등록"}
      </ActionButton>
    </form>
  );
}
