import { useMemo, useState } from "react";

import { EmptyState, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Select } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useWorkspace } from "../../features/workspace";
import { useAsyncData } from "../../hooks/useAsyncData";
import { notificationsApi } from "../../lib/api/notifications";
import { formatDateTime } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const NotificationsPage = (): JSX.Element => {
  const { workspaces } = useWorkspace();
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();

    if (workspaceId) {
      params.set("workspaceId", workspaceId);
    }

    if (status) {
      params.set("status", status);
    }

    params.set("limit", "30");
    return params;
  }, [status, workspaceId]);

  const notifications = useAsyncData(
    async () => {
      const result = await notificationsApi.list(query);
      return result.notifications;
    },
    [query.toString()],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        description="View alert deliveries across all accessible workspaces, then narrow the feed when you need to investigate one area."
        title="Notifications"
      />

      <section className={styles.filterPanel}>
        <div className={styles.filters} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Select
            label="Workspace"
            onChange={(event) => setWorkspaceId(event.target.value)}
            value={workspaceId}
          >
            <option value="">All workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>
          <Select label="Status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
      </section>

      {notifications.isLoading ? (
        <RouteLoading heights={[320]} />
      ) : notifications.error && !notifications.data ? (
        <RouteError message={notifications.error} onRetry={() => void notifications.reload()} />
      ) : (notifications.data?.length ?? 0) === 0 ? (
        <EmptyState
          description="Notification deliveries will appear here after alert rules are triggered and delivery attempts are recorded."
          title="No notifications yet"
        />
      ) : (
        <section className={styles.timelineCard}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Recent activity</h2>
              <p className={styles.sectionBody}>
                Feed of alert-triggered deliveries across the workspaces you can access.
              </p>
            </div>
          </div>
          <div className={styles.timeline}>
            {(notifications.data ?? []).map((item) => (
              <article className={styles.notificationCard} key={item.id}>
                <div className={styles.notificationLeading}>
                  {(item.awsAccountName ?? item.workspaceName).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{item.alertName}</strong>
                  <span>
                    {item.workspaceName}
                    {" - "}
                    {item.awsAccountName ?? "Workspace-wide"}
                    {" - "}
                    {item.recipient}
                  </span>
                </div>
                <div className={styles.rowMeta}>
                  <span className={item.status === "sent" ? styles.statusPill : styles.accentPill}>
                    {item.status}
                  </span>
                  <span>{formatDateTime(item.sentAt ?? item.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
