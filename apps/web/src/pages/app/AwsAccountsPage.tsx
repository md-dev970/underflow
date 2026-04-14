import { Link, useParams } from "react-router-dom";

import { EmptyState, InlineAlert, Skeleton } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { formatDate } from "../../lib/format";
import styles from "./workspace-pages.module.css";

export const AwsAccountsPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const { showToast } = useToast();
  const accounts = useAsyncData(
    async () => {
      const result = await awsAccountsApi.list(workspaceId);
      return result.awsAccounts;
    },
    [workspaceId],
  );

  const handleVerify = async (accountId: string) => {
    try {
      await awsAccountsApi.verify(accountId);
      showToast({ title: "Connection verified", tone: "success" });
      await accounts.reload();
    } catch (error) {
      showToast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unable to verify account",
        tone: "danger",
      });
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      await awsAccountsApi.sync(accountId);
      showToast({ title: "Sync started", tone: "success" });
      await accounts.reload();
    } catch (error) {
      showToast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unable to sync account",
        tone: "danger",
      });
    }
  };

  if (accounts.isLoading) {
    return <Skeleton height={320} />;
  }

  const verified = (accounts.data ?? []).filter((account) => account.status === "verified").length;

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <Link to={`/app/workspaces/${workspaceId}/aws-accounts/connect`}>
            <Button>Connect AWS account</Button>
          </Link>
        }
        description="Manage the AWS accounts linked to this workspace, verify the AssumeRole setup, and trigger cost syncs."
        title="AWS Accounts"
      />

      {accounts.error ? <InlineAlert tone="danger">{accounts.error}</InlineAlert> : null}

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Connected</span>
          <strong className={styles.metricValue}>{accounts.data?.length ?? 0}</strong>
          <p className={styles.metricMeta}>Accounts stored in the workspace connection registry.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Verified</span>
          <strong className={styles.metricValue}>{verified}</strong>
          <p className={styles.metricMeta}>AssumeRole links that passed verification successfully.</p>
        </article>
        <article className={styles.metricCardHighlight}>
          <span className={styles.metricLabel}>Coverage</span>
          <strong className={styles.metricValueSmall}>
            {accounts.data?.length ? Math.round((verified / accounts.data.length) * 100) : 0}%
          </strong>
          <p className={styles.metricMeta}>Readiness of this workspace for full cost monitoring.</p>
        </article>
      </section>

      {(accounts.data?.length ?? 0) === 0 ? (
        <EmptyState
          action={
            <Link to={`/app/workspaces/${workspaceId}/aws-accounts/connect`}>
              <Button>Connect account</Button>
            </Link>
          }
          description="Add your first AWS account using AssumeRole to start syncing cost data."
          title="No AWS accounts connected"
        />
      ) : (
        <section className={styles.accountBoard}>
          {(accounts.data ?? []).map((account) => (
            <article className={styles.accountBoardCard} key={account.id}>
              <div className={styles.accountBoardTop}>
                <div className={styles.accountBadge}>AWS</div>
                <span
                  className={account.status === "verified" ? styles.statusSuccess : styles.statusWarning}
                >
                  {account.status}
                </span>
              </div>

              <div className={styles.accountBoardBody}>
                <h3 className={styles.workspaceName}>{account.name}</h3>
                <p className={styles.workspaceMeta}>{account.roleArn}</p>
              </div>

              <div className={styles.accountBoardStats}>
                <div>
                  <span className={styles.workspaceStatLabel}>Account ID</span>
                  <strong className={styles.workspaceStatValue}>{account.awsAccountId}</strong>
                </div>
                <div>
                  <span className={styles.workspaceStatLabel}>Last Verified</span>
                  <strong className={styles.workspaceStatValue}>{formatDate(account.lastVerifiedAt)}</strong>
                </div>
                <div>
                  <span className={styles.workspaceStatLabel}>Last Sync</span>
                  <strong className={styles.workspaceStatValue}>{formatDate(account.lastSyncAt)}</strong>
                </div>
              </div>

              <div className={styles.accountBoardActions}>
                <Button onClick={() => void handleVerify(account.id)} size="sm" variant="secondary">
                  Verify
                </Button>
                <Button onClick={() => void handleSync(account.id)} size="sm">
                  Run Sync
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
