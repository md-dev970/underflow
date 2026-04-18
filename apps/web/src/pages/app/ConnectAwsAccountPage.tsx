import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { InlineAlert, RouteError, RouteLoading } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, Textarea } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useAsyncData } from "../../hooks/useAsyncData";
import { buildStandardRoleArn, STANDARD_AWS_ROLE_NAME } from "../../lib/aws";
import { awsAccountsApi } from "../../lib/api/aws-accounts";
import styles from "./workspace-pages.module.css";

export const ConnectAwsAccountPage = (): JSX.Element => {
  const { workspaceId = "", awsAccountId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = awsAccountId.length > 0;
  const [form, setForm] = useState({
    name: "",
    awsAccountId: "",
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
              Condition: {
                StringEquals: {
                  "sts:ExternalId": "YOUR-CUSTOMER-EXTERNAL-ID",
                },
              },
            },
          ],
        },
        null,
        2,
      ),
    [],
  );
  const existingAccount = useAsyncData(
    async () => {
      if (!isEditMode) {
        return null;
      }

      const result = await awsAccountsApi.get(awsAccountId);
      return result.awsAccount;
    },
    [isEditMode, awsAccountId],
  );

  useEffect(() => {
    if (!existingAccount.data) {
      return;
    }

    setForm({
      name: existingAccount.data.name,
      awsAccountId: existingAccount.data.awsAccountId,
      externalId: existingAccount.data.externalId ?? "",
    });
  }, [existingAccount.data]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: {
        name: string;
        awsAccountId: string;
        externalId?: string;
      } = {
        name: form.name,
        awsAccountId: form.awsAccountId,
      };

      if (form.externalId.trim()) {
        payload.externalId = form.externalId.trim();
      }

      if (isEditMode) {
        const result = await awsAccountsApi.update(awsAccountId, {
          ...payload,
          externalId: form.externalId.trim() ? form.externalId.trim() : null,
        });
        if (result.awsAccount.status === "pending") {
          showToast({
            title: "AWS account updated",
            description: "Re-verify this role before running the next sync.",
            tone: "success",
          });
        } else {
          showToast({
            title: "AWS account updated",
            tone: "success",
          });
        }
        navigate(`/app/workspaces/${workspaceId}/aws-accounts`);
      } else {
        const result = await awsAccountsApi.create(workspaceId, payload);
        setCreatedAccountId(result.awsAccount.id);
        showToast({ title: "AWS account connected", tone: "success" });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditMode
            ? "Unable to update AWS account"
            : "Unable to connect AWS account",
      );
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

  if (isEditMode && existingAccount.isLoading && !existingAccount.data) {
    return <RouteLoading heights={[420]} />;
  }

  if (isEditMode && existingAccount.error && !existingAccount.data) {
    return (
      <RouteError
        message={existingAccount.error}
        onRetry={() => void existingAccount.reload()}
        title="We couldn't load this AWS account"
      />
    );
  }

  const derivedRoleArn = form.awsAccountId ? buildStandardRoleArn(form.awsAccountId) : "";

  return (
    <div className={styles.page}>
      <div className={styles.pageContextRow}>
        <Link className={styles.contextLink} to={`/app/workspaces/${workspaceId}/aws-accounts`}>
          Back to AWS accounts
        </Link>
        <span className={styles.contextMeta}>Workspace-scoped onboarding</span>
      </div>

      <PageHeader
        description={
          isEditMode
            ? "Update the stored AWS account metadata and re-verify the role if you change the account or trust configuration."
            : "Add an AWS account by storing only role metadata. Underflow will assume the role to sync Cost Explorer data."
        }
        title={isEditMode ? "Edit AWS Account" : "Connect AWS Account"}
      />

      <section className={styles.onboardingGrid}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formCardHeader}>
            <span className={styles.sidePill}>
              {isEditMode ? "Step 1 - Update metadata" : "Step 1 - Connection metadata"}
            </span>
            <h2 className={styles.sectionTitle}>
              {isEditMode ? "AssumeRole configuration" : "AssumeRole onboarding"}
            </h2>
            <p className={styles.sectionBody}>
              Store the AWS account identifier here. Underflow can derive the standard role ARN
              automatically and never asks for long-lived IAM user keys.
            </p>
            <p className={styles.helperNote}>
              This same onboarding flow also works when you are validating against a role in the
              very same AWS account during local development.
            </p>
            <p className={styles.helperNote}>
              Standard customer setup uses the fixed role name{" "}
              <strong>{STANDARD_AWS_ROLE_NAME}</strong>.
            </p>
            {isEditMode ? (
              <p className={styles.helperNote}>
                Changing the AWS account ID or external ID will move this connection back to{" "}
                <strong>pending</strong> until you verify it again.
              </p>
            ) : null}
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
              hint="Underflow derives this automatically when the customer uses the standard role name."
              label="Derived role ARN"
              readOnly
              value={derivedRoleArn}
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
              {isSubmitting ? "Saving..." : isEditMode ? "Save changes" : "Save AWS account"}
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
              The customer role should be named <strong>{STANDARD_AWS_ROLE_NAME}</strong>, trust
              the Underflow AWS account, and expose only the minimum permissions needed for STS and
              Cost Explorer access.
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
