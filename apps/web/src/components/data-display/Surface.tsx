import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

import styles from "./surface.module.css";

const classNames = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const Card = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element => (
  <div className={classNames(styles.card, className)} {...props}>
    {children}
  </div>
);

export const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}): JSX.Element => (
  <Card className={styles.statCard}>
    <span className={styles.statLabel}>{label}</span>
    <strong className={styles.statValue}>{value}</strong>
    {hint ? <span className={styles.statLabel}>{hint}</span> : null}
  </Card>
);

export const Badge = ({
  children,
  tone = "info",
}: PropsWithChildren<{ tone?: "info" | "success" | "warning" | "danger" }>): JSX.Element => (
  <span className={classNames(styles.badge, styles[tone])}>{children}</span>
);

export const Table = ({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}): JSX.Element => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Tabs = ({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element => (
  <div className={styles.tabs}>
    {items.map((item) => (
      <button
        className={classNames(styles.tab, value === item.value && styles.tabActive)}
        key={item.value}
        onClick={() => onChange(item.value)}
        type="button"
      >
        {item.label}
      </button>
    ))}
  </div>
);
