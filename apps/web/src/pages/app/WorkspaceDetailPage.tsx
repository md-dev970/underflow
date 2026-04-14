import { Link, useParams } from "react-router-dom";

import { EmptyState, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Sections";
import { useAsyncData } from "../../hooks/useAsyncData";
import { alertsApi } from "../../lib/api/alerts";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { formatDate } from "../../lib/format";
import { workspacesApi } from "../../lib/api/workspaces";
import styles from "./workspace-pages.module.css";

export const WorkspaceDetailPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const detail = useAsyncData(
    async () => {
      const [workspace, accounts, alerts] = await Promise.all([
        workspacesApi.get(workspaceId),
        awsAccountsApi.list(workspaceId),
        alertsApi.list(workspaceId),
      ]);

      return {
        workspace: workspace.workspace,
        accounts: accounts.awsAccounts,
        alerts: alerts.alerts,
      };
    },
    [workspaceId],
  );

  if (detail.isLoading) {
    return <RouteLoading heights={[360]} />;
  }

  if (!detail.data) {
    return (
      <RouteError
        message={detail.error ?? "Workspace not found"}
        onRetry={() => void detail.reload()}
        title="We couldn't load this workspace"
      />
    );
  }

  const { workspace, accounts, alerts } = detail.data;
  const verifiedAccounts = accounts.filter((account) => account.status === "verified").length;
  const lastSyncAt =
    accounts
      .map((account) => account.lastSyncAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <div className={styles.headerActionRow}>
            <Link to={`/app/workspaces/${workspace.id}/aws-accounts/connect`}>
              <Button>Connect account</Button>
            </Link>
            <Link to={`/app/workspaces/${workspace.id}/alerts/new`}>
              <Button variant="secondary">Create alert</Button>
            </Link>
          </div>
        }
        description={`Workspace slug: ${workspace.slug}`}
        title={workspace.name}
      />

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>AWS Accounts</span>
          <strong className={styles.metricValue}>{accounts.length}</strong>
          <p className={styles.metricMeta}>Accounts connected to this workspace.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Verified Roles</span>
          <strong className={styles.metricValue}>{verifiedAccounts}</strong>
          <p className={styles.metricMeta}>Ready for scheduled or manual cost syncs.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Alert Rules</span>
          <strong className={styles.metricValue}>{alerts.length}</strong>
          <p className={styles.metricMeta}>Thresholds configured for this workspace.</p>
        </article>
        <article className={styles.metricCardHighlight}>
          <span className={styles.metricLabel}>Last Cost Sync</span>
          <strong className={styles.metricValueSmall}>{formatDate(lastSyncAt)}</strong>
          <p className={styles.metricMeta}>Most recent successful sync across linked accounts.</p>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeaderSimple}>
            <div>
              <h2 className={styles.sectionTitle}>Connected AWS accounts</h2>
              <p className={styles.sectionBody}>Track status, verification, and sync recency.</p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <EmptyState
              action={
                <Link to={`/app/workspaces/${workspace.id}/aws-accounts/connect`}>
                  <Button>Connect account</Button>
                </Link>
              }
              description="Add your first AWS account to start syncing cost data for this workspace."
              title="No accounts connected"
            />
          ) : (
            <div className={styles.accountList}>
              {accounts.map((account) => (
                <div className={styles.accountRow} key={account.id}>
                  <div className={styles.accountIdentity}>
                    <div className={styles.accountBadge}>AWS</div>
                    <div>
                      <strong>{account.name}</strong>
                      <span>{account.awsAccountId}</span>
                    </div>
                  </div>
                  <div className={styles.accountMeta}>
                    <span
                      className={
                        account.status === "verified" ? styles.statusSuccess : styles.statusWarning
                      }
                    >
                      {account.status}
                    </span>
                    <span>Verified {formatDate(account.lastVerifiedAt)}</span>
                    <span>Last sync {formatDate(account.lastSyncAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeaderSimple}>
            <div>
              <h2 className={styles.sectionTitle}>Alert rules</h2>
              <p className={styles.sectionBody}>
                Budget thresholds and notification routing for this workspace.
              </p>
            </div>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              action={
                <Link to={`/app/workspaces/${workspace.id}/alerts/new`}>
                  <Button>Create alert</Button>
                </Link>
              }
              description="Alert rules help your team respond to spend changes before the month closes."
              title="No alerts configured"
            />
          ) : (
            <div className={styles.alertList}>
              {alerts.map((alert) => (
                <div className={styles.alertRow} key={alert.id}>
                  <div>
                    <strong>{alert.name}</strong>
                    <span>{alert.currency} {alert.thresholdAmount} - {alert.period}</span>
                  </div>
                  <div className={styles.alertMeta}>
                    <span>{alert.recipientEmail}</span>
                    <span className={alert.isActive ? styles.statusSuccess : styles.statusMuted}>
                      {alert.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};
