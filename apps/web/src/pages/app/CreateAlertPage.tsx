import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, Select, Switch } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useWorkspace } from "../../features/workspace";
import { useAsyncData } from "../../hooks/useAsyncData";
import { alertsApi } from "../../lib/api/alerts";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import type { BudgetAlert } from "../../types/api";
import styles from "./operations-pages.module.css";

const defaultForm = {
  name: "",
  thresholdAmount: "100",
  recipientEmail: "",
  currency: "USD",
  period: "monthly",
  awsAccountId: "",
  isActive: true,
};

export const CreateAlertPage = (): JSX.Element => {
  const params = useParams();
  const { activeWorkspaceId } = useWorkspace();
  const workspaceId = params.workspaceId ?? activeWorkspaceId ?? "";
  const alertId = params.alertId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accounts = useAsyncData(
    async () => {
      if (!workspaceId) {
        return [];
      }

      const result = await awsAccountsApi.list(workspaceId);
      return result.awsAccounts;
    },
    [workspaceId],
  );

  const existingAlert = useAsyncData<BudgetAlert | null>(
    async () => {
      if (!alertId || !workspaceId) {
        return null;
      }

      const result = await alertsApi.list(workspaceId);
      return result.alerts.find((alert) => alert.id === alertId) ?? null;
    },
    [alertId, workspaceId],
  );

  useEffect(() => {
    if (!existingAlert.data) {
      return;
    }

    setForm({
      name: existingAlert.data.name,
      thresholdAmount: String(existingAlert.data.thresholdAmount),
      recipientEmail: existingAlert.data.recipientEmail,
      currency: existingAlert.data.currency,
      period: existingAlert.data.period,
      awsAccountId: existingAlert.data.awsAccountId ?? "",
      isActive: existingAlert.data.isActive,
    });
  }, [existingAlert.data]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!workspaceId) {
        throw new Error("A workspace must be selected before saving an alert.");
      }

      const payload: {
        name: string;
        thresholdAmount: number;
        recipientEmail: string;
        currency?: string;
        period?: string;
        awsAccountId?: string;
      } = {
        name: form.name,
        thresholdAmount: Number(form.thresholdAmount),
        recipientEmail: form.recipientEmail,
      };

      if (form.currency) {
        payload.currency = form.currency;
      }

      if (form.period) {
        payload.period = form.period;
      }

      if (form.awsAccountId) {
        payload.awsAccountId = form.awsAccountId;
      }

      if (alertId) {
        await alertsApi.update(alertId, { ...payload, isActive: form.isActive });
        showToast({ title: "Alert updated", tone: "success" });
      } else {
        await alertsApi.create(workspaceId, payload);
        showToast({ title: "Alert created", tone: "success" });
      }

      navigate(`/app/workspaces/${workspaceId}/alerts`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        description="Define a threshold, choose a recipient, and optionally scope the alert to one AWS account."
        title={alertId ? "Edit Alert" : "Create Alert"}
      />

      <section className={styles.twoColumn}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Alert configuration</h2>
              <p className={styles.sectionBody}>
                Build a guardrail around monthly spend and route notifications to the right owner.
              </p>
            </div>
          </div>

          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

          <div className={styles.formStack}>
            <Input
              label="Alert name"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
            <div className={styles.formGrid}>
              <Input
                label="Threshold amount"
                onChange={(event) =>
                  setForm((current) => ({ ...current, thresholdAmount: event.target.value }))
                }
                required
                type="number"
                value={form.thresholdAmount}
              />
              <Input
                label="Recipient email"
                onChange={(event) =>
                  setForm((current) => ({ ...current, recipientEmail: event.target.value }))
                }
                required
                type="email"
                value={form.recipientEmail}
              />
            </div>
            <div className={styles.formGrid}>
              <Select
                label="Currency"
                onChange={(event) =>
                  setForm((current) => ({ ...current, currency: event.target.value }))
                }
                value={form.currency}
              >
                <option value="USD">USD</option>
              </Select>
              <Select
                label="Period"
                onChange={(event) =>
                  setForm((current) => ({ ...current, period: event.target.value }))
                }
                value={form.period}
              >
                <option value="monthly">Monthly</option>
              </Select>
            </div>
            <Select
              hint="Optional. Leave empty to watch the whole workspace."
              label="AWS account scope"
              onChange={(event) =>
                setForm((current) => ({ ...current, awsAccountId: event.target.value }))
              }
              value={form.awsAccountId}
            >
              <option value="">Entire workspace</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            {alertId ? (
              <Switch
                checked={form.isActive}
                label="Alert is active"
                onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
              />
            ) : null}
          </div>

          <div className={styles.formFooter}>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : alertId ? "Save changes" : "Create alert"}
            </Button>
            <Button onClick={() => navigate(-1)} type="button" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>

        <aside className={styles.sideCard}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>How alerts behave</h2>
              <p className={styles.sectionBody}>
                Alert evaluation runs against synced cost data rather than live API calls, which
                keeps notification decisions repeatable.
              </p>
            </div>
          </div>
          <div className={styles.faqStack}>
            <div className={styles.faqRow}>
              <h4>Workspace-wide or account-specific</h4>
              <p>Leave account scope empty to watch the entire workspace instead of one AWS account.</p>
            </div>
            <div className={styles.faqRow}>
              <h4>Recipient ownership</h4>
              <p>Use a shared team inbox when multiple operators need visibility into budget events.</p>
            </div>
            <div className={styles.faqRow}>
              <h4>Threshold tuning</h4>
              <p>Start with obvious limits first, then add more granular environment-specific rules later.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
