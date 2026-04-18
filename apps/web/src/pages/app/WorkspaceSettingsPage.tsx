import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useToast } from "../../features/toast";
import { useWorkspace } from "../../features/workspace";
import { slugify } from "../../lib/format";
import { workspacesApi } from "../../lib/api/workspaces";
import styles from "./operations-pages.module.css";

export const WorkspaceSettingsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { activeWorkspace, refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", slug: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setForm({ name: activeWorkspace.name, slug: activeWorkspace.slug });
    }
  }, [activeWorkspace]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!activeWorkspace) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await workspacesApi.update(activeWorkspace.id, form);
      await refreshWorkspaces();
      showToast({ title: "Workspace updated", tone: "success" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspace) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${activeWorkspace.name}? This removes every connected AWS account, alert, notification, sync run, and synced cost record in the workspace.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const result = await workspacesApi.remove(activeWorkspace.id);
      setActiveWorkspaceId(null);
      await refreshWorkspaces();
      showToast({
        title: "Workspace deleted",
        description: `Removed ${result.deleted.deletedAwsAccountCount} AWS accounts, ${result.deleted.deletedAlertCount} alerts, and ${result.deleted.deletedNotificationCount} notifications.`,
        tone: "success",
      });
      navigate("/app/workspaces");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to delete workspace");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className={styles.page}>
        <PageHeader
          description="Select or create a workspace before editing shared settings."
          title="Workspace Settings"
        />
        <section className={styles.contentCard}>
          <p className={styles.cardText}>No active workspace is selected right now.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        description="Manage the current workspace name and URL slug. Team management can be added later without changing the shell."
        title="Workspace Settings"
      />

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <section className={styles.twoColumn}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Workspace identity</h2>
              <p className={styles.sectionBody}>
                Update the display name and internal slug used across the app.
              </p>
            </div>
          </div>

          <div className={styles.formStack}>
            <Input
              label="Workspace name"
              onChange={(event) => {
                const nextName = event.target.value;
                setForm((current) => ({
                  ...current,
                  name: nextName,
                  slug: current.slug === slugify(current.name) ? slugify(nextName) : current.slug,
                }));
              }}
              value={form.name}
            />
            <Input
              label="Slug"
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
              value={form.slug}
            />
          </div>

          <div className={styles.formFooter}>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save workspace"}
            </Button>
          </div>
        </form>

        <aside className={styles.sideCard}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Future workspace controls</h2>
              <p className={styles.sectionBody}>
                This is where member access, archive flows, and team-level permissions can be
                layered in later.
              </p>
            </div>
          </div>
          <div className={styles.faqStack}>
            <div className={styles.faqRow}>
              <h4>Member management</h4>
              <p>Add owners, admins, and read-only observers without changing the sidebar structure.</p>
            </div>
            <div className={styles.faqRow}>
              <h4>Scoped environments</h4>
              <p>Use one workspace per product or environment to keep reporting and alerts clear.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.dangerCard}>
        <h2 className={styles.dangerTitle}>Danger zone</h2>
        <p className={styles.dangerText}>
          Deleting a workspace permanently removes every connected AWS account, alert,
          notification delivery, sync run, and synced cost snapshot tied to it.
        </p>
        <div className={styles.formFooter} style={{ marginTop: "1rem" }}>
          <Button disabled={isDeleting} onClick={() => void handleDelete()} variant="danger">
            {isDeleting ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      </section>
    </div>
  );
};
