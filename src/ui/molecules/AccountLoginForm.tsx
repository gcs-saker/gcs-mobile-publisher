import { useState, type FormEvent } from "react";
import type { LoginCredentials } from "../../features/auth/contracts/authentication";
import { ActionButton } from "../atoms/ActionButton";
import { TextField } from "../atoms/TextField";

export interface AccountLoginFormProps {
  disabled: boolean;
  onLogin(credentials: LoginCredentials): Promise<boolean>;
}

export function AccountLoginForm({ disabled, onLogin }: AccountLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onLogin({ username: username.trim(), password });
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <TextField autoComplete="username" disabled={disabled} label="아이디" name="username"
        onChange={(event) => setUsername(event.target.value)} required value={username} />
      <TextField autoComplete="current-password" disabled={disabled} label="비밀번호" name="password"
        onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      <ActionButton disabled={disabled} type="submit">{disabled ? "로그인 중…" : "로그인"}</ActionButton>
    </form>
  );
}
