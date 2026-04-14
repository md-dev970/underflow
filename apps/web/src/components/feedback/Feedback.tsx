import type { PropsWithChildren, ReactNode } from "react";

import { Card } from "../data-display/Surface";
import { Button } from "../forms/Button";
import styles from "./feedback.module.css";

const classNames = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const InlineAlert = ({
  children,
  tone = "info",
}: PropsWithChildren<{ tone?: "info" | "success" | "warning" | "danger" }>): JSX.Element => (
  <div className={classNames(styles.inlineAlert, styles[tone])}>{children}</div>
);

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element => (
  <Card className={styles.emptyState}>
    <h3 className={styles.emptyTitle}>{title}</h3>
    <p className={styles.emptyBody}>{description}</p>
    {action}
  </Card>
);

export const Skeleton = ({ height = 18 }: { height?: number }): JSX.Element => (
  <div className={styles.skeleton} style={{ height }} />
);

export const RouteLoading = ({
  heights = [56, 220, 320],
}: {
  heights?: number[];
}): JSX.Element => (
  <div className={styles.routeStateStack}>
    {heights.map((height, index) => (
      <Skeleton height={height} key={`${height}-${index}`} />
    ))}
  </div>
);

export const RouteError = ({
  message,
  onRetry,
  title = "We couldn't load this view",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}): JSX.Element => (
  <Card className={styles.routeStateCard}>
    <div className={styles.routeStateStack}>
      <div>
        <h3 className={styles.emptyTitle}>{title}</h3>
        <p className={styles.emptyBody}>{message}</p>
      </div>
      {onRetry ? (
        <div className={styles.routeStateActions}>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      ) : null}
    </div>
  </Card>
);

export const Modal = ({
  children,
  onClose,
}: PropsWithChildren<{ onClose: () => void }>): JSX.Element => (
  <div className={styles.overlay} onClick={onClose} role="presentation">
    <div
      className={styles.modal}
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      {children}
    </div>
  </div>
);

export const Drawer = ({
  children,
  onClose,
}: PropsWithChildren<{ onClose: () => void }>): JSX.Element => (
  <div className={styles.overlay} onClick={onClose} role="presentation">
    <aside
      className={styles.drawer}
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      {children}
    </aside>
  </div>
);

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element => (
  <Modal onClose={onCancel}>
    <div className="pageStack">
      <h2>{title}</h2>
      <p style={{ color: "var(--color-text-muted)" }}>{description}</p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="danger">
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
