import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useWorkspace } from "../../features/workspace";
import { slugify } from "../../lib/format";
import { workspacesApi } from "../../lib/api/workspaces";
import styles from "./workspace-pages.module.css";

export const CreateWorkspacePage = (): JSX.Element => {
  const navigate = useNavigate();
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const workspace = await workspacesApi.create({ name, slug });
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

  return (
    <div className={styles.page}>
      <PageHeader
        description="Create a dedicated workspace for each environment, product, or business unit you want to monitor."
        title="Create Workspace"
      />

      <section className={styles.onboardingGrid}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formCardHeader}>
            <h2 className={styles.sectionTitle}>Workspace configuration</h2>
            <p className={styles.sectionBody}>
              This workspace becomes the boundary for linked AWS accounts, synced cost data,
              alert rules, and reporting views.
            </p>
          </div>

          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

          <div className={styles.formStack}>
            <Input
              label="Workspace name"
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!slug) {
                  setSlug(slugify(nextName));
                }
              }}
              placeholder="Platform production"
              required
              value={name}
            />
            <Input
              hint="Used in URLs and internal references."
              label="Slug"
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="platform-production"
              required
              value={slug}
            />
          </div>

          <div className={styles.formFooter}>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating workspace..." : "Create workspace"}
            </Button>
            <Button onClick={() => navigate(-1)} type="button" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>

        <aside className={styles.sidePanel}>
          <div className={styles.sidePanelSection}>
            <span className={styles.sidePill}>Recommended structure</span>
            <h3 className={styles.sideTitle}>Name workspaces around ownership boundaries</h3>
            <p className={styles.sideText}>
              Good examples are product lines, customer environments, or internal teams.
              That keeps cost summaries and alert routing easier to reason about later.
            </p>
          </div>

          <div className={styles.infoList}>
            <div className={styles.infoListItem}>
              <strong>Production</strong>
              <span>Track live customer-facing infrastructure separately.</span>
            </div>
            <div className={styles.infoListItem}>
              <strong>Staging</strong>
              <span>Catch pre-production drift and cost spikes before release.</span>
            </div>
            <div className={styles.infoListItem}>
              <strong>Internal tools</strong>
              <span>Monitor team-specific AWS spending without mixing it into revenue workloads.</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
