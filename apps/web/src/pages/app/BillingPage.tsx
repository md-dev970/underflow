import { PageHeader } from "../../components/layout/Sections";
import styles from "./operations-pages.module.css";

export const BillingPage = (): JSX.Element => (
  <div className={styles.page}>
    <PageHeader
      description="Billing UI is intentionally non-operational while Underflow stays open source and free-first."
      title="Billing"
    />

    <section className={styles.heroCard}>
      <span className={styles.heroEyebrow}>Public beta</span>
      <h2 className={styles.heroTitle}>Billing is intentionally disabled for now</h2>
      <p className={styles.heroBody}>
        Underflow is currently free while the public repository is open and the product is
        still maturing. This page shows the intended shell without exposing payment plumbing.
      </p>
    </section>

    <section className={styles.equalGrid}>
      <article className={styles.betaCard}>
        <h3 className={styles.sectionTitle}>What stays available</h3>
        <div className={styles.faqStack}>
          <div className={styles.faqRow}>
            <h4>All core monitoring flows</h4>
            <p>Workspaces, AWS account connections, cost syncs, reporting, and budget alerts remain available.</p>
          </div>
          <div className={styles.faqRow}>
            <h4>No credit card required</h4>
            <p>The public beta is designed to be safe to share and simple to explore without payment setup.</p>
          </div>
        </div>
      </article>

      <article className={styles.betaCard}>
        <h3 className={styles.sectionTitle}>Later billing surface</h3>
        <div className={styles.faqStack}>
          <div className={styles.faqRow}>
            <h4>Usage tiers</h4>
            <p>Future plans can be mapped to workspace scale, account count, and team collaboration features.</p>
          </div>
          <div className={styles.faqRow}>
            <h4>Enterprise onboarding</h4>
            <p>Private deployment, support, and contracting can be layered in once the public MVP is stable.</p>
          </div>
        </div>
      </article>
    </section>
  </div>
);
