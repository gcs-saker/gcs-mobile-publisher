import type { ChangeEventHandler } from "react";

export interface TextFieldProps {
  autoCapitalize?: string;
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "password" | "text";
  value: string;
}

export function TextField({
  autoCapitalize,
  autoComplete,
  disabled = false,
  label,
  maxLength,
  minLength,
  name,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: TextFieldProps) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <input
        {...(autoCapitalize ? { autoCapitalize } : {})}
        {...(autoComplete ? { autoComplete } : {})}
        disabled={disabled}
        {...(maxLength === undefined ? {} : { maxLength })}
        {...(minLength === undefined ? {} : { minLength })}
        name={name}
        onChange={onChange}
        {...(placeholder ? { placeholder } : {})}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
