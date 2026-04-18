import {
  ArrowUpRightFromCircle,
  BellRing,
  CheckCircle2,
  Database,
  Layers3,
  RefreshCcw,
  ServerCog,
  WalletCards,
} from "lucide-react";

import styles from "./mini-product-surfaces.module.css";

export const CostMiniSurface = (): JSX.Element => (
  <div aria-hidden="true" className={`${styles.surface} ${styles.costSurface}`}>
    <div className={styles.surfaceHeader}>
      <div>
        <p className={styles.eyebrow}>This month</p>
        <strong className={styles.title}>Cost Summary</strong>
      </div>
      <span className={styles.chip}>
        <WalletCards size={14} strokeWidth={2.1} />
        AWS
      </span>
    </div>
    <div className={styles.costHero}>
      <div>
        <span className={styles.costLabel}>Forecast</span>
        <strong className={styles.costValue}>$4,892</strong>
      </div>
      <span className={styles.costDelta}>+8.4%</span>
    </div>
    <div className={styles.costChart}>
      <span className={styles.costBar} />
      <span className={styles.costBar} />
      <span className={styles.costBar} />
      <span className={styles.costBar} />
      <span className={styles.costBar} />
      <span className={styles.costBar} />
      <span className={styles.costBar} />
    </div>
    <div className={styles.costList}>
      <div className={styles.costRow}>
        <span className={styles.costService}>
          <Database size={14} strokeWidth={2} />
          RDS
        </span>
        <strong>$1,380</strong>
      </div>
      <div className={styles.costRow}>
        <span className={styles.costService}>
          <ServerCog size={14} strokeWidth={2} />
          EC2
        </span>
        <strong>$1,110</strong>
      </div>
      <div className={styles.costRow}>
        <span className={styles.costService}>
          <Layers3 size={14} strokeWidth={2} />
          S3
        </span>
        <strong>$624</strong>
      </div>
    </div>
  </div>
);

export const AlertMiniSurface = (): JSX.Element => (
  <div aria-hidden="true" className={`${styles.surface} ${styles.alertSurface}`}>
    <div className={styles.alertPill}>Threshold exceeded</div>
    <div className={styles.alertCard}>
      <div className={styles.alertIcon}>
        <BellRing size={14} strokeWidth={2.2} />
      </div>
      <div>
        <strong className={styles.alertTitle}>Sandbox spend spike</strong>
        <p className={styles.alertBody}>EC2 crossed 80% of monthly cap</p>
      </div>
    </div>
    <div className={styles.alertTimeline}>
      <span className={styles.alertLine} />
      <span className={styles.alertLine} />
      <span className={styles.alertLine} />
    </div>
    <div className={styles.alertFooter}>
      <span>Email sent</span>
      <span>2 min ago</span>
    </div>
  </div>
);

export const WorkspaceMiniSurface = (): JSX.Element => (
  <div aria-hidden="true" className={`${styles.surface} ${styles.workspaceSurface}`}>
    <div className={styles.workspaceRow}>
      <span className={styles.workspaceName}>Core Platform</span>
      <span className={styles.workspaceState}>Healthy</span>
    </div>
    <div className={styles.workspaceRow}>
      <span className={styles.workspaceName}>Growth Ops</span>
      <span className={styles.workspaceState}>2 alerts</span>
    </div>
    <div className={styles.workspaceRow}>
      <span className={styles.workspaceName}>Sandbox Labs</span>
      <span className={styles.workspaceState}>Pending sync</span>
    </div>
  </div>
);

export const AwsOnboardingMiniSurface = (): JSX.Element => (
  <div aria-hidden="true" className={`${styles.surface} ${styles.awsSurface}`}>
    <div className={styles.awsTop}>
      <div>
        <p className={styles.eyebrow}>Workspace account</p>
        <strong className={styles.title}>AWS Connection</strong>
      </div>
      <span className={styles.awsBadge}>Verified</span>
    </div>
    <div className={styles.awsRole}>
      <span>UnderflowCostExplorerRead</span>
      <ArrowUpRightFromCircle size={14} strokeWidth={2.2} />
    </div>
    <div className={styles.awsSteps}>
      <div className={styles.awsStep}>
        <CheckCircle2 size={15} strokeWidth={2.2} />
        Trust policy added
      </div>
      <div className={styles.awsStep}>
        <RefreshCcw size={15} strokeWidth={2.2} />
        Last sync 5 min ago
      </div>
    </div>
  </div>
);
