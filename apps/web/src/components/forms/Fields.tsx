import {
  useId,
  useState,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import styles from "./field.module.css";

interface BaseFieldProps {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
}

export const FormField = ({
  fieldId,
  label,
  hint,
  error,
  children,
}: PropsWithChildren<BaseFieldProps & { fieldId?: string }>): JSX.Element => (
  <div className={styles.field}>
    {label ? (
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
    ) : null}
    {children}
    {error ? <span className={styles.error}>{error}</span> : null}
    {!error && hint ? <span className={styles.hint}>{hint}</span> : null}
  </div>
);

export const Input = ({
  label,
  hint,
  error,
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>): JSX.Element => {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <FormField error={error} fieldId={fieldId} hint={hint} label={label}>
      <input className={styles.control} id={fieldId} {...props} />
    </FormField>
  );
};

export const Textarea = ({
  label,
  hint,
  error,
  ...props
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element => {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <FormField error={error} fieldId={fieldId} hint={hint} label={label}>
      <textarea className={styles.control} id={fieldId} rows={4} {...props} />
    </FormField>
  );
};

export const Select = ({
  label,
  hint,
  error,
  children,
  ...props
}: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>): JSX.Element => {
  const id = useId();
  const fieldId = props.id ?? id;

  return (
    <FormField error={error} fieldId={fieldId} hint={hint} label={label}>
      <select className={styles.control} id={fieldId} {...props}>
        {children}
      </select>
    </FormField>
  );
};

export const PasswordInput = ({
  label,
  hint,
  error,
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>): JSX.Element => {
  const id = useId();
  const fieldId = props.id ?? id;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField error={error} fieldId={fieldId} hint={hint} label={label}>
      <span className={styles.passwordWrap}>
        <input
          className={styles.control}
          id={fieldId}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <button
          className={styles.passwordToggle}
          onClick={() => setIsVisible((value) => !value)}
          type="button"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </span>
    </FormField>
  );
};

export const Checkbox = ({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>): JSX.Element => {
  const id = useId();

  return (
    <label className={styles.checkRow} htmlFor={id}>
      <input className={styles.checkbox} id={id} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
};

export const Switch = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): JSX.Element => (
  <label className={styles.checkRow}>
    <button
      aria-checked={checked}
      className={styles.switch}
      data-active={checked}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={styles.switchThumb} />
    </button>
    <span>{label}</span>
  </label>
);
