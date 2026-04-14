import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { BarChartCard, DonutChartCard } from "../../components/charts/ChartCard";
import { EmptyState, InlineAlert, Skeleton } from "../../components/feedback/Feedback";
import { Input, Select } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { currentMonthRange, formatCurrency } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const CostSummaryPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [awsAccountId, setAwsAccountId] = useState("");

  const data = useAsyncData(
    async () => {
      const query = new URLSearchParams({ from, to });
      if (awsAccountId) {
        query.set("awsAccountId", awsAccountId);
      }

      const [summary, services, accounts] = await Promise.all([
        awsAccountsApi.summary(workspaceId, query),
        awsAccountsApi.byService(workspaceId, query),
        awsAccountsApi.list(workspaceId),
      ]);

      return {
        summary: summary.summary,
        services: services.services,
        accounts: accounts.awsAccounts,
      };
    },
    [workspaceId, from, to, awsAccountId],
  );

  if (data.isLoading) {
    return <Skeleton height={320} />;
  }

  const services = data.data?.services ?? [];
  const topService = [...services].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className={styles.page}>
      <PageHeader
        description="Explore total spend for a workspace or narrow the view to a specific AWS account and time window."
        title="Cost Summary"
      />

      {data.error ? <InlineAlert tone="danger">{data.error}</InlineAlert> : null}

      <section className={styles.filterPanel}>
        <div className={styles.surfaceHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Reporting filters</h2>
            <p className={styles.sectionBody}>
              Adjust the date range or scope the summary to one linked AWS account.
            </p>
          </div>
        </div>
        <div className={styles.filters}>
          <Input label="From" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          <Input label="To" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          <Select
            label="AWS account"
            onChange={(event) => setAwsAccountId(event.target.value)}
            value={awsAccountId}
          >
            <option value="">All accounts</option>
            {(data.data?.accounts ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Spend</span>
          <strong className={styles.metricValue}>
            {formatCurrency(data.data?.summary.totalAmount ?? 0, data.data?.summary.currency ?? "USD")}
          </strong>
          <p className={styles.metricHint}>Aggregate spend for the selected reporting window.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Tracked Services</span>
          <strong className={styles.metricValue}>{services.length}</strong>
          <p className={styles.metricHint}>Distinct AWS services returned in synced records.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Range Start</span>
          <strong className={styles.metricValue}>{from}</strong>
          <p className={styles.metricHint}>Inclusive start date for the current summary.</p>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Top Driver</span>
          <strong className={styles.metricValue}>{topService?.serviceName ?? "None"}</strong>
          <p className={styles.metricHint}>
            {topService ? formatCurrency(topService.amount, topService.currency) : "No service data yet."}
          </p>
        </article>
      </section>

      {services.length === 0 ? (
        <EmptyState
          description="There is no synced cost data for this filter range yet."
          title="No cost data returned"
        />
      ) : (
        <>
          <section className={styles.twoColumn}>
            <BarChartCard
              data={services.map((service) => ({
                label: service.serviceName,
                value: service.amount,
              }))}
              title="Spend by service"
            />
            <DonutChartCard
              data={services.map((service) => ({
                label: service.serviceName,
                value: service.amount,
              }))}
              title="Allocation mix"
            />
          </section>

          <section className={styles.contentCard}>
            <div className={styles.surfaceHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Service allocation</h2>
                <p className={styles.sectionBody}>
                  Ranked view of the synced services contributing to total AWS spend.
                </p>
              </div>
            </div>
            <div className={styles.listStack}>
              {services.map((service) => (
                <div className={styles.listRow} key={service.serviceName}>
                  <div>
                    <strong>{service.serviceName}</strong>
                    <span>Synced service-level usage from Cost Explorer.</span>
                  </div>
                  <div className={styles.rowMeta}>
                    <strong>{formatCurrency(service.amount, service.currency)}</strong>
                    <span>{service.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
