import { Card } from "../data-display/Surface";
import { Button } from "../forms/Button";
import type { ToastItem } from "../../features/toast";
import styles from "./feedback.module.css";

export const ToastViewport = ({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}): JSX.Element => (
  <div className={styles.toastViewport}>
    {toasts.map((toast) => (
      <Card className={styles.toast} key={toast.id}>
        <div className="pageStack" style={{ gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
            <div>
              <strong>{toast.title}</strong>
              {toast.description ? (
                <p style={{ margin: "0.3rem 0 0", color: "var(--color-text-muted)" }}>
                  {toast.description}
                </p>
              ) : null}
            </div>
            <Button onClick={() => onDismiss(toast.id)} size="sm" variant="ghost">
              Close
            </Button>
          </div>
        </div>
      </Card>
    ))}
  </div>
);
