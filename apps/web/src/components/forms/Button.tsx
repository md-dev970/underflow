import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const classNames = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: PropsWithChildren<ButtonProps>): JSX.Element => (
  <button
    className={classNames(
      styles.button,
      styles[variant],
      size !== "md" && styles[size],
      className,
    )}
    type={type}
    {...props}
  >
    {children}
  </button>
);

export const IconButton = ({
  children,
  className,
  variant = "secondary",
  ...props
}: PropsWithChildren<Omit<ButtonProps, "size">>): JSX.Element => (
  <Button
    className={classNames(styles.iconButton, className)}
    variant={variant}
    {...props}
  >
    {children}
  </Button>
);
