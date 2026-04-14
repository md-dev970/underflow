import type { PropsWithChildren, ReactNode } from "react";

import styles from "./sections.module.css";

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): JSX.Element => (
  <div className={styles.pageHeader}>
    <div>
      <h1 className={styles.pageTitle}>{title}</h1>
      {description ? <p className={styles.pageDescription}>{description}</p> : null}
    </div>
    {actions}
  </div>
);

export const SectionHeader = ({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}): JSX.Element => (
  <div className={styles.sectionHeader}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    {actions}
  </div>
);

export const KpiGrid = ({ children }: PropsWithChildren): JSX.Element => (
  <div className={styles.kpiGrid}>{children}</div>
);

export const FilterBar = ({ children }: PropsWithChildren): JSX.Element => (
  <div className={styles.filterBar}>{children}</div>
);
