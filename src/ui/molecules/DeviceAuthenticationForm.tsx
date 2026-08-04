import { useState, type FormEvent } from "react";
import type { DeviceCredential, DeviceRegistrationRequest } from "../../features/auth/contracts/authentication";
import { ActionButton } from "../atoms/ActionButton";
import { TextField } from "../atoms/TextField";

type AuthenticationMode = "authenticate" | "register";

export interface DeviceAuthenticationFormProps {
  disabled: boolean;
  onAuthenticate(identity: DeviceCredential): Promise<boolean>;
  onRegister(request: DeviceRegistrationRequest): Promise<boolean>;
}

export function DeviceAuthenticationForm(props: DeviceAuthenticationFormProps) {
  const [mode, setMode] = useState<AuthenticationMode>("authenticate");
  const [deviceUuid, setDeviceUuid] = useState("");
  const [credential, setCredential] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [provisioningToken, setProvisioningToken] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (mode === "authenticate") {
      await props.onAuthenticate({ credential, deviceUuid: deviceUuid.trim() });
      return;
    }
    await props.onRegister({ deviceName: deviceName.trim(), provisioningToken: provisioningToken.trim() });
  }

  return (
    <>
      <div className="auth-mode" role="tablist" aria-label="기기 인증 방식">
        <button aria-selected={mode === "authenticate"} disabled={props.disabled}
          onClick={() => setMode("authenticate")} role="tab" type="button">기기 인증</button>
        <button aria-selected={mode === "register"} disabled={props.disabled}
          onClick={() => setMode("register")} role="tab" type="button">기기 등록</button>
      </div>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        {mode === "authenticate" ? (
          <>
            <TextField autoComplete="username" disabled={props.disabled} label="기기 UUID" name="deviceUuid"
              onChange={(event) => setDeviceUuid(event.target.value)} required value={deviceUuid} />
            <TextField autoComplete="current-password" disabled={props.disabled} label="기기 Credential" name="credential"
              onChange={(event) => setCredential(event.target.value)} required type="password" value={credential} />
          </>
        ) : (
          <>
            <TextField autoComplete="off" disabled={props.disabled} label="기기 이름" name="deviceName"
              onChange={(event) => setDeviceName(event.target.value)} required value={deviceName} />
            <TextField autoComplete="one-time-code" disabled={props.disabled} label="기기 등록 코드" name="provisioningToken"
              onChange={(event) => setProvisioningToken(event.target.value)} required type="password" value={provisioningToken} />
          </>
        )}
        <ActionButton disabled={props.disabled} type="submit">
          {props.disabled ? "처리 중…" : mode === "authenticate" ? "기기 인증" : "기기 등록"}
        </ActionButton>
      </form>
    </>
  );
}
