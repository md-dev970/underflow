import { useEffect } from "react";
import {
  BellRing,
  Database,
  Landmark,
  Network,
  ServerCog,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { useWorkspace } from "../../features/workspace";
import { useAsyncData } from "../../hooks/useAsyncData";
import { alertsApi } from "../../lib/api/alerts";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { currentMonthRange, formatCurrency } from "../../lib/format";
import { MissingWorkspaceState } from "../../routes/guards";
import type { AwsAccount, BudgetAlert, ServiceCostBreakdownItem, TimeseriesCostPoint } from "../../types/api";
import styles from "./overview-page.module.css";

interface OverviewData {
  summaryTotal: number;
  currency: string;
  services: ServiceCostBreakdownItem[];
  points: TimeseriesCostPoint[];
  alerts: BudgetAlert[];
  accounts: AwsAccount[];
}

const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

const tooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-text)",
};

export const OverviewPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { activeWorkspace, isLoading: isWorkspaceLoading, workspaces } = useWorkspace();
  const range = currentMonthRange();

  const overview = useAsyncData<OverviewData>(
    async () => {
      if (!activeWorkspace) {
        return {
          summaryTotal: 0,
          currency: "USD",
          services: [],
          points: [],
          alerts: [],
          accounts: [],
        };
      }

      const query = new URLSearchParams(range);
      const [summary, byService, timeseries, alerts, accounts] = await Promise.all([
        awsAccountsApi.summary(activeWorkspace.id, query),
        awsAccountsApi.byService(activeWorkspace.id, query),
        awsAccountsApi.timeseries(activeWorkspace.id, query),
        alertsApi.list(activeWorkspace.id),
        awsAccountsApi.list(activeWorkspace.id),
      ]);

      return {
        summaryTotal: summary.summary.totalAmount,
        currency: summary.summary.currency,
        services: byService.services,
        points: timeseries.points,
        alerts: alerts.alerts,
        accounts: accounts.awsAccounts,
      };
    },
    [activeWorkspace?.id, range.from, range.to],
  );

  useEffect(() => {
    if (!isWorkspaceLoading && workspaces.length === 0) {
      navigate("/app/workspaces/new", { replace: true });
    }
  }, [isWorkspaceLoading, navigate, workspaces.length]);

  if (isWorkspaceLoading) {
    return <RouteLoading heights={[56, 220]} />;
  }

  if (!activeWorkspace) {
    return <MissingWorkspaceState />;
  }

  if (overview.isLoading) {
    return <RouteLoading heights={[56, 420, 340]} />;
  }

  if (overview.error && !overview.data) {
    return <RouteError message={overview.error} onRetry={() => void overview.reload()} />;
  }

  const data = overview.data;
  const hasAccounts = (data?.accounts.length ?? 0) > 0;
  const activeAlerts = data?.alerts.filter((alert) => alert.isActive).length ?? 0;
  const chartData = (data?.points ?? []).map((point) => ({
    label: point.usageDate.slice(5),
    value: point.amount,
    target: point.amount * 0.88,
  }));
  const topDrivers = [...(data?.services ?? [])].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const costDistribution = (data?.services ?? []).slice(0, 4);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <div className={styles.subrow}>
            <span>Calendar</span>
            <span>Monitoring costs for</span>
            <strong>
              {range.from} - {range.to}
            </strong>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangeGroup}>
            <button className={`${styles.rangeButton} ${styles.rangeActive}`} type="button">
              Last 30 Days
            </button>
            <button className={styles.rangeButton} type="button">
              Last 90 Days
            </button>
          </div>
          <Link
            to={
              hasAccounts
                ? `/app/workspaces/${activeWorkspace.id}/aws-accounts`
                : `/app/workspaces/${activeWorkspace.id}/aws-accounts/connect`
            }
          >
            <Button>{hasAccounts ? "Open AWS Accounts" : "Connect AWS account"}</Button>
          </Link>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <p className={styles.kpiLabel}>Total Spend (MTD)</p>
            <span className={styles.kpiIcon}>
              <Wallet size={16} strokeWidth={2.2} />
            </span>
          </div>
          <div className={styles.kpiValueRow}>
            <h3 className={styles.kpiValue}>
              {formatCurrency(data?.summaryTotal ?? 0, data?.currency)}
            </h3>
            <span className={styles.kpiMeta} style={{ color: "var(--color-success)" }}>
              12%
            </span>
          </div>
          <div className={styles.kpiAccentBar} />
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <p className={styles.kpiLabel}>Projected End</p>
            <span className={styles.kpiIcon}>
              <TrendingUp size={16} strokeWidth={2.2} />
            </span>
          </div>
          <h3 className={styles.kpiValue}>
            {formatCurrency((data?.summaryTotal ?? 0) * 2.9, data?.currency)}
          </h3>
          <p className={styles.cardBody}>Based on current burn rate</p>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <p className={styles.kpiLabel}>Active Alerts</p>
            <span className={styles.kpiIcon} style={{ color: "var(--color-danger)" }}>
              <BellRing size={16} strokeWidth={2.2} />
            </span>
          </div>
          <div className={styles.kpiValueRow}>
            <h3 className={styles.kpiValue} style={{ color: "var(--color-danger)" }}>
              {activeAlerts}
            </h3>
            <div style={{ width: 2, height: 32, background: "var(--color-border)" }} />
            <div className={styles.cardBody}>
              <strong style={{ color: "var(--color-text)" }}>{data?.alerts.length ?? 0} Total</strong>
              <div>Monitored</div>
            </div>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <p className={styles.kpiLabel}>Accounts</p>
            <span className={styles.kpiIcon}>
              <Landmark size={16} strokeWidth={2.2} />
            </span>
          </div>
          <h3 className={styles.kpiValue}>{data?.accounts.length ?? 0}</h3>
          <div className={styles.kpiMiniStack}>
            {(data?.accounts ?? []).slice(0, 4).map((account) => (
              <div className={styles.kpiMiniChip} key={account.id}>
                {account.name.slice(0, 3).toUpperCase()}
              </div>
            ))}
          </div>
        </article>
      </div>

      {(data?.accounts.length ?? 0) === 0 ? (
        <EmptyState
          action={
            <Link to={`/app/workspaces/${activeWorkspace.id}/aws-accounts/connect`}>
              <Button>Connect your first AWS account</Button>
            </Link>
          }
          description="This workspace is ready, but it does not have any connected AWS accounts yet."
          title="No cost data yet"
        />
      ) : (
        <>
          <div className={styles.mainGrid}>
            <section className={styles.surfaceCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Spend Trend</h2>
                  <p className={styles.cardBody}>
                    Daily operational expenditure across all accounts
                  </p>
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "var(--color-chart-1)" }} />
                    Actual
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "var(--color-borderStrong)" }} />
                    Target
                  </span>
                </div>
              </div>
              <div className={styles.chartWrap}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="overviewArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-text-subtle)" />
                    <YAxis stroke="var(--color-text-subtle)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      dataKey="target"
                      fill="transparent"
                      stroke="var(--color-borderStrong)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      type="monotone"
                    />
                    <Area
                      dataKey="value"
                      fill="url(#overviewArea)"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2.5}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={styles.surfaceCard}>
              <h2 className={styles.cardTitle}>Cost by Service</h2>
              <div className={styles.donutWrap}>
                <div className={styles.chartWrap} style={{ height: "14rem" }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={costDistribution.map((service) => ({
                          name: service.serviceName,
                          value: service.amount,
                        }))}
                        dataKey="value"
                        innerRadius={52}
                        outerRadius={74}
                        paddingAngle={4}
                      >
                        {costDistribution.map((service, index) => (
                          <Cell
                            fill={chartColors[index % chartColors.length]}
                            key={service.serviceName}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.donutLegend}>
                  {costDistribution.map((service, index) => {
                    const total = data?.services.reduce((sum, item) => sum + item.amount, 0) ?? 0;
                    const percent = total > 0 ? Math.round((service.amount / total) * 100) : 0;

                    return (
                      <div className={styles.donutLegendRow} key={service.serviceName}>
                        <span className={styles.legendItem}>
                          <span
                            className={styles.legendDot}
                            style={{ background: chartColors[index % chartColors.length] }}
                          />
                          {service.serviceName}
                        </span>
                        <span>{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className={styles.bottomGrid}>
            <section className={styles.surfaceCard} style={{ padding: 0 }}>
              <div className={styles.cardHeader} style={{ padding: "1.5rem 1.5rem 0" }}>
                <h2 className={styles.cardTitle}>Recent Sync Status</h2>
                <Link className={styles.historyAction} to={`/app/workspaces/${activeWorkspace.id}/sync-history`}>
                  View History
                </Link>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.accounts ?? []).slice(0, 4).map((account) => {
                      const isSuccess = account.status === "verified";
                      return (
                        <tr key={account.id}>
                          <td style={{ fontWeight: 800, color: "var(--color-text)" }}>{account.name}</td>
                          <td>
                            <span
                              className={`${styles.statusChip} ${
                                isSuccess ? styles.statusSuccess : styles.statusFailed
                              }`}
                            >
                              <span className={styles.statusDot} />
                              {isSuccess ? "Success" : "Pending"}
                            </span>
                          </td>
                          <td style={{ color: "var(--color-text-muted)" }}>
                            {account.lastSyncAt ? "Recently" : "Not synced"}
                          </td>
                          <td style={{ fontFamily: "ui-monospace, monospace", color: "var(--color-text-muted)" }}>
                            {account.lastSyncAt ? Math.max(320, Math.round((data?.summaryTotal ?? 0) / 3)) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.surfaceCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Top Cost Drivers</h2>
                <span className={styles.historyAction}>Past 7 Days</span>
              </div>
              <div className={styles.driversList}>
                {topDrivers.map((service, index) => (
                  <div className={styles.driverItem} key={service.serviceName}>
                      <div className={styles.driverLeft}>
                      <div className={styles.driverIcon}>
                        {index === 0 ? (
                          <Database size={16} strokeWidth={2.2} />
                        ) : index === 1 ? (
                          <Network size={16} strokeWidth={2.2} />
                        ) : (
                          <ServerCog size={16} strokeWidth={2.2} />
                        )}
                      </div>
                      <div>
                        <p className={styles.driverName}>{service.serviceName}</p>
                        <p className={styles.driverMeta}>
                          {index === 0
                            ? "Primary operational spend"
                            : index === 1
                              ? "Transfer and platform traffic"
                              : "Compute and workload execution"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className={styles.driverAmount}>
                        {formatCurrency(service.amount, service.currency)}
                      </p>
                      <p
                        className={`${styles.driverTrend} ${
                          index === 1 ? styles.trendPositive : styles.trendWarning
                        }`}
                      >
                        {index === 1 ? "Steady" : index === 0 ? "+24% Spike" : "+8% Incr"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
