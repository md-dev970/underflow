import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, EmptyState, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useAsyncData } from "../../hooks/useAsyncData";
import { alertsApi } from "../../lib/api/alerts";
import { formatCurrency } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const AlertsPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const alerts = useAsyncData(
    async () => {
      const result = await alertsApi.list(workspaceId);
      return result.alerts;
    },
    [workspaceId],
  );

  const handleDelete = async () => {
    if (!selectedAlertId) {
      return;
    }

    try {
      await alertsApi.remove(selectedAlertId);
      showToast({ title: "Alert deleted", tone: "success" });
      setSelectedAlertId(null);
      await alerts.reload();
    } catch (error) {
      showToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete alert",
        tone: "danger",
      });
    }
  };

  if (alerts.isLoading) {
    return <RouteLoading heights={[320]} />;
  }

  if (alerts.error && !alerts.data) {
    return <RouteError message={alerts.error} onRetry={() => void alerts.reload()} />;
  }

  const items = alerts.data ?? [];
  const activeCount = items.filter((alert) => alert.isActive).length;

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <Link to={`/app/workspaces/${workspaceId}/alerts/new`}>
            <Button>Create alert</Button>
          </Link>
        }
        description="Create and maintain budget thresholds for this workspace or a specific connected AWS account."
        title="Alert Rules"
      />

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Rules</span>
          <strong className={styles.metricValue}>{items.length}</strong>
          <p className={styles.metricHint}>Configured budget checks for this workspace.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Active</span>
          <strong className={styles.metricValue}>{activeCount}</strong>
          <p className={styles.metricHint}>Rules currently eligible for alert evaluation jobs.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Recipients</span>
          <strong className={styles.metricValue}>
            {new Set(items.map((alert) => alert.recipientEmail)).size}
          </strong>
          <p className={styles.metricHint}>Unique inboxes currently receiving notifications.</p>
        </article>
      </section>

      {items.length === 0 ? (
        <EmptyState
          action={
            <Link to={`/app/workspaces/${workspaceId}/alerts/new`}>
              <Button>Create alert</Button>
            </Link>
          }
          description="Create your first alert to notify stakeholders when spend crosses a threshold."
          title="No alert rules yet"
        />
      ) : (
        <section className={styles.listStack}>
          {items.map((alert) => (
            <article className={styles.alertCard} key={alert.id}>
              <div>
                <strong>{alert.name}</strong>
                <span>
                  {alert.awsAccountId ? "Scoped to one AWS account" : "Watching the entire workspace"} ·{" "}
                  {alert.period}
                </span>
              </div>
              <div className={styles.rowMeta}>
                <span>{alert.recipientEmail}</span>
                <strong>{formatCurrency(alert.thresholdAmount, alert.currency)}</strong>
              </div>
              <div className={styles.formFooter}>
                <span className={alert.isActive ? styles.statusPill : styles.mutedPill}>
                  {alert.isActive ? "Active" : "Paused"}
                </span>
                <Button
                  onClick={() => navigate(`/app/alerts/${alert.id}/edit`)}
                  size="sm"
                  variant="secondary"
                >
                  Edit
                </Button>
                <Button onClick={() => setSelectedAlertId(alert.id)} size="sm" variant="danger">
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedAlertId ? (
        <ConfirmDialog
          confirmLabel="Delete alert"
          description="This removes the alert rule from the workspace."
          onCancel={() => setSelectedAlertId(null)}
          onConfirm={() => void handleDelete()}
          title="Delete alert?"
        />
      ) : null}
    </div>
  );
};
