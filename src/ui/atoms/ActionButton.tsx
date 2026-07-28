import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import type { ActionButtonTone } from "../types";

export interface ActionButtonProps
  extends PropsWithChildren,
    ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ActionButtonTone;
}

export function ActionButton({
  children,
  className = "",
  tone = "default",
  type = "button",
  ...props
}: ActionButtonProps) {
  const classes = ["button", `button--${tone}`, className].filter(Boolean).join(" ");
  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
