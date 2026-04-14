import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { BarChartCard } from "../../components/charts/ChartCard";
import { EmptyState, InlineAlert, Skeleton } from "../../components/feedback/Feedback";
import { Input } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useAsyncData } from "../../hooks/useAsyncData";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import { currentMonthRange, formatCurrency } from "../../lib/format";
import styles from "./operations-pages.module.css";

export const CostByServicePage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const data = useAsyncData(
    async () => {
      const query = new URLSearchParams({ from, to });
      return awsAccountsApi.byService(workspaceId, query);
    },
    [workspaceId, from, to],
  );

  if (data.isLoading) {
    return <Skeleton height={320} />;
  }

  const services = data.data?.services ?? [];
  const topService = [...services].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className={styles.page}>
      <PageHeader
        description="Break down workspace spend by AWS service to understand which systems drive monthly cost."
        title="Cost By Service"
      />

      {data.error ? <InlineAlert tone="danger">{data.error}</InlineAlert> : null}

      <section className={styles.filterPanel}>
        <div className={styles.filters} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Input label="From" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          <Input label="To" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </div>
      </section>

      {services.length === 0 ? (
        <EmptyState
          description="Sync a connected AWS account to populate service-level cost records."
          title="No service-level records"
        />
      ) : (
        <>
          <section className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Top Service</span>
              <strong className={styles.metricValue}>{topService?.serviceName ?? "None"}</strong>
              <p className={styles.metricHint}>Highest spend contributor in the selected range.</p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Top Amount</span>
              <strong className={styles.metricValue}>
                {topService ? formatCurrency(topService.amount, topService.currency) : "$0.00"}
              </strong>
              <p className={styles.metricHint}>Current cost concentration for the leading service.</p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Tracked Services</span>
              <strong className={styles.metricValue}>{services.length}</strong>
              <p className={styles.metricHint}>Services contributing to the current breakdown.</p>
            </article>
          </section>

          <section className={styles.equalGrid}>
            <BarChartCard
              data={services.map((service) => ({
                label: service.serviceName,
                value: service.amount,
              }))}
              title="Service ranking"
            />
            <section className={styles.contentCard}>
              <div className={styles.surfaceHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Service ledger</h2>
                  <p className={styles.sectionBody}>
                    Use this ranked list to identify the biggest cost concentrations quickly.
                  </p>
                </div>
              </div>
              <div className={styles.listStack}>
                {services.map((service) => (
                  <div className={styles.listRow} key={service.serviceName}>
                    <div>
                      <strong>{service.serviceName}</strong>
                      <span>Service-level allocation in the chosen date range.</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <strong>{formatCurrency(service.amount, service.currency)}</strong>
                      <span>{service.currency}</span>
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
