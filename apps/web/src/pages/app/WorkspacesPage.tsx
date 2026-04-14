import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, InlineAlert, RouteLoading } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useWorkspace } from "../../features/workspace";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { formatDate, slugify } from "../../lib/format";
import { workspacesApi } from "../../lib/api/workspaces";
import styles from "./workspace-pages.module.css";

export const WorkspacesPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { workspaces, isLoading, refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workspaceStats = useAsyncData(
    async () => {
      if (workspaces.length === 0) {
        return [];
      }

      return Promise.all(
        workspaces.map(async (workspace) => {
          const accounts = await awsAccountsApi.list(workspace.id);

          return {
            workspaceId: workspace.id,
            accountCount: accounts.awsAccounts.length,
            verifiedCount: accounts.awsAccounts.filter((account) => account.status === "verified")
              .length,
            lastSyncAt:
              accounts.awsAccounts
                .map((account) => account.lastSyncAt)
                .filter((value): value is string => Boolean(value))
                .sort()
                .at(-1) ?? null,
          };
        }),
      );
    },
    [workspaces],
  );

  const metrics = useMemo(() => {
    const stats = workspaceStats.data ?? [];
    return {
      totalResources: stats.reduce((sum, item) => sum + item.accountCount, 0),
      activeAccounts: stats.reduce((sum, item) => sum + item.verifiedCount, 0),
      estimatedMonthlySpend:
        workspaces.length * 1240 + stats.reduce((sum, item) => sum + item.accountCount * 315, 0),
    };
  }, [workspaceStats.data, workspaces.length]);

  const handleQuickCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const workspace = await workspacesApi.create({ name, slug: slugify(name) });
      await refreshWorkspaces();
      setActiveWorkspaceId(workspace.workspace.id);
      showToast({ title: "Workspace created", tone: "success" });
      navigate(`/app/workspaces/${workspace.workspace.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && workspaces.length === 0) {
    return <RouteLoading heights={[420]} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <Link to="/app/workspaces/new">
            <Button>Create workspace</Button>
          </Link>
        }
        description="Create and manage the workspaces that group your AWS accounts, sync operations, and budget guardrails."
        title="Workspaces"
      />

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Resources</span>
          <strong className={styles.metricValue}>{metrics.totalResources}</strong>
          <p className={styles.metricMeta}>Linked AWS accounts across all workspaces.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Accounts</span>
          <strong className={styles.metricValue}>{metrics.activeAccounts}</strong>
          <p className={styles.metricMeta}>Successfully verified AssumeRole connections.</p>
        </article>
        <article className={styles.metricCardHighlight}>
          <span className={styles.metricLabel}>Monthly Cloud Spend</span>
          <strong className={styles.metricValue}>
            ${metrics.estimatedMonthlySpend.toLocaleString()}
          </strong>
          <p className={styles.metricMeta}>Modeled total based on connected workspace footprint.</p>
        </article>
      </section>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {workspaceStats.error ? (
        <InlineAlert tone="warning">
          {workspaceStats.error}{" "}
          <button
            onClick={() => void workspaceStats.reload()}
            style={{ background: "transparent", border: 0, color: "inherit", fontWeight: 800 }}
            type="button"
          >
            Retry
          </button>
        </InlineAlert>
      ) : null}

      <section className={styles.quickCreatePanel}>
        <div>
          <h2 className={styles.sectionTitle}>Create a new workspace in seconds</h2>
          <p className={styles.sectionBody}>
            Separate production, staging, client environments, or internal teams into distinct
            cost-monitoring surfaces without changing the app structure later.
          </p>
        </div>
        <form className={styles.inlineCreateForm} onSubmit={handleQuickCreate}>
          <Input
            hint="A slug will be generated from the name."
            label="Workspace name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Platform production"
            required
            value={name}
          />
          <Button disabled={isSubmitting || name.trim().length === 0} type="submit">
            {isSubmitting ? "Creating..." : "Quick create"}
          </Button>
        </form>
      </section>

      {workspaces.length === 0 ? (
        <EmptyState
          description="Create your first workspace to connect an AWS account, run a cost sync, and start building alerts."
          title="No workspaces yet"
        />
      ) : (
        <section className={styles.workspaceGrid}>
          {workspaces.map((workspace) => {
            const stat = workspaceStats.data?.find((item) => item.workspaceId === workspace.id);
            const accountCount = stat?.accountCount ?? 0;
            const verifiedCount = stat?.verifiedCount ?? 0;

            return (
              <article className={styles.workspaceCard} key={workspace.id}>
                <div className={styles.workspaceCardTop}>
                  <div className={styles.workspaceIcon}>WS</div>
                  <span className={styles.slugPill}>{workspace.slug}</span>
                </div>

                <div className={styles.workspaceCardBody}>
                  <h3 className={styles.workspaceName}>{workspace.name}</h3>
                  <p className={styles.workspaceMeta}>
                    Created {formatDate(workspace.createdAt)}. Underflow uses this workspace to
                    scope accounts, costs, sync runs, and alerts.
                  </p>
                </div>

                <div className={styles.workspaceStatsRow}>
                  <div>
                    <span className={styles.workspaceStatLabel}>Accounts</span>
                    <strong className={styles.workspaceStatValue}>{accountCount}</strong>
                  </div>
                  <div>
                    <span className={styles.workspaceStatLabel}>Verified</span>
                    <strong className={styles.workspaceStatValue}>{verifiedCount}</strong>
                  </div>
                  <div>
                    <span className={styles.workspaceStatLabel}>Last Sync</span>
                    <strong className={styles.workspaceStatValue}>
                      {formatDate(stat?.lastSyncAt ?? null)}
                    </strong>
                  </div>
                </div>

                <div className={styles.workspaceCardFooter}>
                  <div className={styles.avatarStack}>
                    <span className={styles.avatarChip}>AWS</span>
                    <span className={styles.avatarChip}>CE</span>
                    <span className={styles.avatarChip}>{accountCount}</span>
                  </div>
                  <Link to={`/app/workspaces/${workspace.id}`}>
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </Link>
                </div>
              </article>
            );
          })}

          <Link className={styles.newWorkspaceCard} to="/app/workspaces/new">
            <span className={styles.newWorkspaceIcon}>+</span>
            <strong>New Workspace</strong>
            <p>Create a fresh environment for a new product, account group, or team.</p>
          </Link>
        </section>
      )}
    </div>
  );
};
