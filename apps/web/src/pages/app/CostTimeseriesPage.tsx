import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { LineChartCard } from "../../components/charts/ChartCard";
import { EmptyState, InlineAlert, Skeleton } from "../../components/feedback/Feedback";
import { Input } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { currentMonthRange, formatCurrency } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const CostTimeseriesPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const data = useAsyncData(
    async () => {
      const query = new URLSearchParams({ from, to });
      return awsAccountsApi.timeseries(workspaceId, query);
    },
    [workspaceId, from, to],
  );

  if (data.isLoading) {
    return <Skeleton height={320} />;
  }

  const points = data.data?.points ?? [];
  const total = points.reduce((sum, point) => sum + point.amount, 0);
  const peak = [...points].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className={styles.page}>
      <PageHeader
        description="Review daily spend progression over time for the selected workspace."
        title="Cost Timeseries"
      />

      {data.error ? <InlineAlert tone="danger">{data.error}</InlineAlert> : null}

      <section className={styles.filterPanel}>
        <div className={styles.filters} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Input label="From" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          <Input label="To" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </div>
      </section>

      {points.length === 0 ? (
        <EmptyState
          description="Run a sync to build a historical trend for this workspace."
          title="No time-series points"
        />
      ) : (
        <>
          <section className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Observed Total</span>
              <strong className={styles.metricValue}>
                {formatCurrency(total, points[0]?.currency ?? "USD")}
              </strong>
              <p className={styles.metricHint}>Sum of all daily points in the current range.</p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Peak Day</span>
              <strong className={styles.metricValue}>{peak?.usageDate ?? "None"}</strong>
              <p className={styles.metricHint}>
                {peak ? formatCurrency(peak.amount, peak.currency) : "No data."}
              </p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Trend Points</span>
              <strong className={styles.metricValue}>{points.length}</strong>
              <p className={styles.metricHint}>Daily points returned for this reporting window.</p>
            </article>
          </section>

          <section className={styles.equalGrid}>
            <LineChartCard
              data={points.map((point) => ({
                label: point.usageDate,
                value: point.amount,
              }))}
              title="Daily spend trend"
            />
            <section className={styles.contentCard}>
              <div className={styles.surfaceHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Daily ledger</h2>
                  <p className={styles.sectionBody}>
                    Timeline of spend progression for the selected period.
                  </p>
                </div>
              </div>
              <div className={styles.timeline}>
                {points.map((point) => (
                  <div className={styles.timelineRow} key={point.usageDate}>
                    <div>
                      <strong>{point.usageDate}</strong>
                      <span>Workspace spend captured in synced snapshot data.</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <strong>{formatCurrency(point.amount, point.currency)}</strong>
                      <span>{point.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
};
