import { useState, type FormEvent } from "react";
import type {
  LoginRequest,
  SignupRequest,
} from "../../features/auth/contracts/authentication";
import { ActionButton } from "../atoms/ActionButton";
import { TextField } from "../atoms/TextField";

type AuthenticationMode = "login" | "signup";

export interface AccountAuthenticationFormProps {
  disabled: boolean;
  onLogin(request: LoginRequest): Promise<boolean>;
  onSignup(request: SignupRequest): Promise<boolean>;
}

export function AccountAuthenticationForm({
  disabled,
  onLogin,
  onSignup,
}: AccountAuthenticationFormProps) {
  const [mode, setMode] = useState<AuthenticationMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationMessage("");
    if (mode === "login") {
      await onLogin({ password, username: username.trim() });
      return;
    }
    if (password !== confirmPassword) {
      setValidationMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    const completed = await onSignup({
      email: email.trim(),
      inviteCode: inviteCode.trim(),
      password,
      role: "viewer",
      username: username.trim(),
    });
    if (completed) {
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    }
  }

  function changeMode(nextMode: AuthenticationMode): void {
    setMode(nextMode);
    setValidationMessage("");
  }

  return (
    <>
      <div className="auth-mode" role="tablist" aria-label="인증 방식">
        <button
          aria-selected={mode === "login"}
          disabled={disabled}
          onClick={() => changeMode("login")}
          role="tab"
          type="button"
        >
          로그인
        </button>
        <button
          aria-selected={mode === "signup"}
          disabled={disabled}
          onClick={() => changeMode("signup")}
          role="tab"
          type="button"
        >
          회원가입
        </button>
      </div>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <TextField
          autoComplete="username"
          disabled={disabled}
          label="아이디"
          maxLength={50}
          minLength={3}
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          value={username}
        />
        {mode === "signup" ? (
          <TextField
            autoComplete="email"
            disabled={disabled}
            label="이메일"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        ) : null}
        <TextField
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          disabled={disabled}
          label="비밀번호"
          maxLength={128}
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        {mode === "signup" ? (
          <>
            <TextField
              autoComplete="new-password"
              disabled={disabled}
              label="비밀번호 확인"
              maxLength={128}
              minLength={8}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
            <TextField
              autoComplete="one-time-code"
              disabled={disabled}
              label="등록 코드"
              name="inviteCode"
              onChange={(event) => setInviteCode(event.target.value)}
              required
              value={inviteCode}
            />
          </>
        ) : null}
        {validationMessage ? (
          <p className="message message--error" role="alert">{validationMessage}</p>
        ) : null}
        <ActionButton disabled={disabled} type="submit">
          {disabled ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
        </ActionButton>
      </form>
    </>
  );
}
