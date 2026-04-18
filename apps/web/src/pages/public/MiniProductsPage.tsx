import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import {
  AlertMiniSurface,
  AwsOnboardingMiniSurface,
  CostMiniSurface,
  WorkspaceMiniSurface,
} from "../../components/marketing/MiniProductSurfaces";
import { Button } from "../../components/forms/Button";
import styles from "./mini-products-page.module.css";

export const MiniProductsPage = (): JSX.Element => (
  <div className={styles.page}>
    <div className={styles.inner}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          <Sparkles size={14} strokeWidth={2.2} />
          Marketing component lab
        </span>
        <h1 className={styles.title}>Mini product surfaces</h1>
        <p className={styles.body}>
          This sandbox lets us tune the animated landing-page product snippets in one
          place before we drop them back into the public site.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/">
            <Button variant="secondary">Back to landing page</Button>
          </Link>
        </div>
      </header>

      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.cardWide}`}>
          <h2 className={styles.cardTitle}>Cost summary surface</h2>
          <p className={styles.cardBody}>
            Animated bars and top service rows for the service-level breakdown story.
          </p>
          <div className={styles.surfaceWrap}>
            <CostMiniSurface />
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardTall} ${styles.cardDark}`}>
          <h2 className={styles.cardTitle}>Alert surface</h2>
          <p className={styles.cardBody}>
            A compact threshold card with motion cues for urgency and delivery state.
          </p>
          <div className={styles.surfaceWrapNarrow}>
            <AlertMiniSurface />
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardWide}`}>
          <h2 className={styles.cardTitle}>Workspace surface</h2>
          <p className={styles.cardBody}>
            Floating workspace rows for health, alert count, and sync readiness.
          </p>
          <div className={styles.surfaceWrapCompact}>
            <WorkspaceMiniSurface />
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardWide}`}>
          <h2 className={styles.cardTitle}>AWS onboarding surface</h2>
          <p className={styles.cardBody}>
            A small onboarding panel focused on role naming, verification, and sync
            state.
          </p>
          <div className={styles.surfaceWrapCompact}>
            <AwsOnboardingMiniSurface />
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardFull}`}>
          <h2 className={styles.cardTitle}>Combined preview</h2>
          <p className={styles.cardBody}>
            A quick side-by-side sanity check for tone, spacing, and motion harmony.
          </p>
          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <CostMiniSurface />
            <WorkspaceMiniSurface />
            <AwsOnboardingMiniSurface />
            <AlertMiniSurface />
          </div>
        </article>
      </section>
    </div>
  </div>
);
