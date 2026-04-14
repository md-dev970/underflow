import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, Textarea } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import styles from "./workspace-pages.module.css";

export const ConnectAwsAccountPage = (): JSX.Element => {
  const { workspaceId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    awsAccountId: "",
    roleArn: "",
    externalId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const rolePolicySnippet = useMemo(
    () =>
      JSON.stringify(
        {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: "YOUR-UNDERFLOW-AWS-ACCOUNT" },
              Action: "sts:AssumeRole",
            },
          ],
        },
        null,
        2,
      ),
    [],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: {
        name: string;
        awsAccountId: string;
        roleArn: string;
        externalId?: string;
      } = {
        name: form.name,
        awsAccountId: form.awsAccountId,
        roleArn: form.roleArn,
      };

      if (form.externalId.trim()) {
        payload.externalId = form.externalId.trim();
      }

      const result = await awsAccountsApi.create(workspaceId, payload);
      setCreatedAccountId(result.awsAccount.id);
      showToast({ title: "AWS account connected", tone: "success" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to connect AWS account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!createdAccountId) {
      return;
    }

    try {
      await awsAccountsApi.verify(createdAccountId);
      showToast({ title: "AWS role verified", tone: "success" });
      navigate(`/app/workspaces/${workspaceId}/aws-accounts`);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify AWS role");
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        description="Add an AWS account by storing only role metadata. Underflow will assume the role to sync Cost Explorer data."
        title="Connect AWS Account"
      />

      <section className={styles.onboardingGrid}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formCardHeader}>
            <span className={styles.sidePill}>Step 1 - Connection metadata</span>
            <h2 className={styles.sectionTitle}>AssumeRole onboarding</h2>
            <p className={styles.sectionBody}>
              Store the AWS account identifier and role ARN here. Underflow never asks for
              long-lived IAM user keys.
            </p>
          </div>

          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

          <div className={styles.formStack}>
            <Input
              label="Account nickname"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Production edge"
              required
              value={form.name}
            />
            <Input
              label="AWS account ID"
              onChange={(event) =>
                setForm((current) => ({ ...current, awsAccountId: event.target.value }))
              }
              placeholder="123456789012"
              required
              value={form.awsAccountId}
            />
            <Input
              label="Role ARN"
              onChange={(event) =>
                setForm((current) => ({ ...current, roleArn: event.target.value }))
              }
              placeholder="arn:aws:iam::123456789012:role/UnderflowCostMonitor"
              required
              value={form.roleArn}
            />
            <Input
              hint="Optional. Supply this only if your trust relationship requires an external ID."
              label="External ID"
              onChange={(event) =>
                setForm((current) => ({ ...current, externalId: event.target.value }))
              }
              value={form.externalId}
            />
          </div>

          <div className={styles.formFooter}>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save AWS account"}
            </Button>
            <Link to={`/app/workspaces/${workspaceId}/aws-accounts`}>
              <Button type="button" variant="secondary">
                Back to accounts
              </Button>
            </Link>
          </div>

          {createdAccountId ? (
            <div className={styles.successPanel}>
              <strong>Account saved</strong>
              <p>Next, verify the AssumeRole configuration before running your first cost sync.</p>
              <Button onClick={() => void handleVerify()} type="button">
                Verify connection
              </Button>
            </div>
          ) : null}
        </form>

        <aside className={styles.sidePanel}>
          <div className={styles.sidePanelSection}>
            <span className={styles.sidePill}>Step 2 - IAM trust policy</span>
            <h3 className={styles.sideTitle}>Create a cross-account role in AWS</h3>
            <p className={styles.sideText}>
              The role must allow Underflow to call `sts:AssumeRole` and should expose only
              the minimum permissions needed for STS and Cost Explorer access.
            </p>
          </div>

          <Textarea
            label="Suggested trust policy"
            readOnly
            style={{ minHeight: 220, fontFamily: "ui-monospace, monospace" }}
            value={rolePolicySnippet}
          />

          <div className={styles.infoList}>
            <div className={styles.infoListItem}>
              <strong>Least privilege</strong>
              <span>Grant only the Cost Explorer and identity permissions you need.</span>
            </div>
            <div className={styles.infoListItem}>
              <strong>No static keys</strong>
              <span>The backend stores role metadata only and does not persist access keys.</span>
            </div>
            <div className={styles.infoListItem}>
              <strong>Verify after save</strong>
              <span>Run verification immediately to catch trust-policy mistakes early.</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
