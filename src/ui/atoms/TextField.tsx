import type { ChangeEventHandler } from "react";

export interface TextFieldProps {
  autoCapitalize?: string;
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  maxLength?: number;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function TextField({
  autoCapitalize,
  autoComplete,
  disabled = false,
  label,
  maxLength,
  name,
  onChange,
  placeholder,
  required = false,
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
        name={name}
        onChange={onChange}
        {...(placeholder ? { placeholder } : {})}
        required={required}
        value={value}
      />
    </label>
  );
}
