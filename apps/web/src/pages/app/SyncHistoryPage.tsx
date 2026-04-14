import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { EmptyState, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Select } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { formatDateTime } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const SyncHistoryPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const [status, setStatus] = useState("");
  const [awsAccountId, setAwsAccountId] = useState("");

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (status) {
      params.set("status", status);
    }

    if (awsAccountId) {
      params.set("awsAccountId", awsAccountId);
    }

    params.set("limit", "30");
    return params;
  }, [awsAccountId, status]);

  const accounts = useAsyncData(
    async () => {
      const result = await awsAccountsApi.list(workspaceId);
      return result.awsAccounts;
    },
    [workspaceId],
  );

  const syncHistory = useAsyncData(
    async () => {
      const result = await awsAccountsApi.syncHistory(workspaceId, filters);
      return result.syncRuns;
    },
    [filters.toString(), workspaceId],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        description="Review recent sync runs for the current workspace, including status, timestamps, and failures."
        title="Sync History"
      />

      <section className={styles.filterPanel}>
        <div className={styles.filters} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Select
            label="AWS account"
            onChange={(event) => setAwsAccountId(event.target.value)}
            value={awsAccountId}
          >
            <option value="">All accounts</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <Select label="Status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
      </section>

      {syncHistory.isLoading ? (
        <RouteLoading heights={[320]} />
      ) : syncHistory.error && !syncHistory.data ? (
        <RouteError message={syncHistory.error} onRetry={() => void syncHistory.reload()} />
      ) : (syncHistory.data?.length ?? 0) === 0 ? (
        <EmptyState
          description="Trigger a manual sync or wait for the scheduler to create cost sync runs for this workspace."
          title="No sync runs yet"
        />
      ) : (
        <section className={styles.contentCard}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Recent sync runs</h2>
              <p className={styles.sectionBody}>
                Status and timing for manual and scheduled cost ingestion runs.
              </p>
            </div>
          </div>
          <div className={styles.timeline}>
            {(syncHistory.data ?? []).map((run) => (
              <article className={styles.syncRow} key={run.id}>
                <div>
                  <strong>{run.awsAccountName}</strong>
                  <span>
                    {run.accountNumber}
                    {" - Started "}
                    {formatDateTime(run.startedAt)}
                    {run.errorMessage ? ` - ${run.errorMessage}` : ""}
                  </span>
                </div>
                <div className={styles.rowMeta}>
                  <span className={run.status === "completed" ? styles.statusPill : styles.accentPill}>
                    {run.status}
                  </span>
                  <span>{formatDateTime(run.finishedAt ?? run.startedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
