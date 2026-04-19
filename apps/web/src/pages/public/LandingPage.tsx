import {
  ArrowUpRight,
  BellRing,
  Check,
  CircleDot,
  Command,
  Lock,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { Link } from "react-router-dom";

import overviewDarkImage from "../../assets/showcase/overview-dark.png";
import overviewLightImage from "../../assets/showcase/overview-light.png";
import {
  AlertMiniSurface,
  AwsOnboardingMiniSurface,
  CostMiniSurface,
  WorkspaceMiniSurface,
} from "../../components/marketing/MiniProductSurfaces";
import { Button } from "../../components/forms/Button";
import { appConfig } from "../../lib/config";
import type { ThemeMode } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";
import styles from "./landing-page.module.css";

export const LandingPage = (): JSX.Element => {
  const { mode, resolvedTheme, setMode } = useTheme();
  const themeOrder: ThemeMode[] = ["light", "dark", "system"];
  const themeMeta: Record<ThemeMode, { label: string; icon: typeof Sun }> = {
    light: { label: "Light mode", icon: Sun },
    dark: { label: "Dark mode", icon: Moon },
    system: { label: "System theme", icon: Monitor },
  };
  const currentThemeIndex = Math.max(themeOrder.indexOf(mode), 0);
  const nextTheme = themeOrder[(currentThemeIndex + 1) % themeOrder.length] ?? "light";
  const ThemeIcon = themeMeta[mode].icon;
  const overviewImage = resolvedTheme === "dark" ? overviewDarkImage : overviewLightImage;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLinks}>
            <span className={styles.brand}>{appConfig.appName}</span>
            <div className={styles.navGroup}>
              <a className={styles.navAnchor} href="#product">
                Product
              </a>
              <a className={styles.navAnchor} href="#pricing">
                Pricing
              </a>
              <a className={styles.navAnchor} href="#security">
                Security
              </a>
            </div>
          </div>
          <div className={styles.navGroup}>
            <button
              aria-label={`${themeMeta[mode].label}. Switch to ${themeMeta[nextTheme].label.toLowerCase()}`}
              className={styles.themeToggle}
              onClick={() => setMode(nextTheme)}
              title={`${themeMeta[mode].label} active`}
              type="button"
            >
              <ThemeIcon size={18} strokeWidth={2.2} />
            </button>
            <Link className={styles.ghostLink} to="/login">
              Login
            </Link>
            <Link to="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.pill}>
              <span className={styles.pillDot} />
              Now in Public Beta
            </div>
            <h1 className={styles.heroTitle}>
              Cloud billing doesn&apos;t have to be a{" "}
              <span className={styles.heroAccent}>black box.</span>
            </h1>
            <p className={styles.heroBody}>
              Stop guessing. Start knowing. Underflow gives engineers and finance teams a
              shared language for AWS costs with precision transparency.
            </p>
            <div className={styles.heroActions}>
              <Link to="/signup">
                <Button className={styles.heroPrimary} size="lg">
                  Get Started for Free
                </Button>
              </Link>
              <a href="#product">
                <Button className={styles.heroSecondary} size="lg" variant="secondary">
                  View Demo
                </Button>
              </a>
            </div>
            <div className={styles.dashboardWrap}>
              <div className={styles.dashboardGlow} />
              <div className={styles.dashboardCard}>
                <img
                  alt="Underflow overview dashboard showing active workspaces, connected accounts, sync status, and cost visibility cards"
                  className={styles.dashboardImage}
                  src={overviewImage}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sectionMuted} id="product">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeadingWrap}>
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>Built for the Modern Cloud Stack</h2>
                <p className={styles.sectionBody}>
                  We strip away the noise and focus on the metrics that actually drive
                  decisions. No clutter, just clarity.
                </p>
              </div>
            </div>
            <div className={styles.featureGrid}>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <CircleDot size={20} strokeWidth={2.2} />
                </div>
                <h3 className={styles.featureTitle}>Absolute Clarity</h3>
                <p className={styles.featureBody}>
                  Every cent accounted for. See exactly which resource, tag, or developer
                  is driving your AWS spend in real time.
                </p>
              </article>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <ArrowUpRight size={20} strokeWidth={2.2} />
                </div>
                <h3 className={styles.featureTitle}>Precision Insights</h3>
                <p className={styles.featureBody}>
                  Automated anomaly detection identifies spikes before they become
                  month-end surprises. Stop firefighting, start optimizing.
                </p>
              </article>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Command size={20} strokeWidth={2.2} />
                </div>
                <h3 className={styles.featureTitle}>Developer Centric</h3>
                <p className={styles.featureBody}>
                  Built by engineers, for engineers. CLI-first thinking with a premium UI
                  that doesn&apos;t feel like enterprise software.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.stepsHeader}>
              <h2 className={styles.sectionTitle}>How it Works</h2>
              <p className={styles.stepsSubtext}>
                Zero-friction onboarding. Get meaningful insights in under 5 minutes.
              </p>
            </div>
            <div className={styles.stepsGrid}>
              <div className={styles.stepsLine} />
              <article className={styles.stepCard}>
                <div className={styles.stepBadge}>1</div>
                <h3 className={styles.featureTitle}>Connect AWS</h3>
                <p className={styles.featureBody}>
                  Securely link your accounts using industry-standard IAM AssumeRole
                  protocols.
                </p>
              </article>
              <article className={styles.stepCard}>
                <div className={styles.stepBadge}>2</div>
                <h3 className={styles.featureTitle}>Sync Data</h3>
                <p className={styles.featureBody}>
                  Underflow pulls cost explorer data and stores snapshots for fast,
                  consistent reporting.
                </p>
              </article>
              <article className={styles.stepCard}>
                <div className={styles.stepBadge}>3</div>
                <h3 className={styles.featureTitle}>Get Insights</h3>
                <p className={styles.featureBody}>
                  Interactive dashboards and automated alerts provide immediate visibility
                  into your spend.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.securitySection} id="security">
          <div className={styles.securityOrb} />
          <div className={styles.sectionInner}>
            <div className={styles.securityGrid}>
              <div>
                <div className={styles.securityPill}>Shielded AWS Access</div>
                <h2 className={styles.securityTitle}>
                  Your data is yours.
                  <br />
                  We just help you see it.
                </h2>
                <div className={styles.securityList}>
                  <div className={styles.securityItem}>
                    <div className={styles.securityItemIcon}>
                      <Check size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h3 className={`${styles.featureTitle} ${styles.securityFeatureTitle}`}>
                        AWS AssumeRole Protocol
                      </h3>
                      <p className={`${styles.featureBody} ${styles.securityFeatureBody}`}>
                        No static credentials. We use cross-account IAM roles with
                        limited permissions, ensuring Underflow never has root access to
                        your infrastructure.
                      </p>
                    </div>
                  </div>
                  <div className={styles.securityItem}>
                    <div className={styles.securityItemIcon}>
                      <Lock size={18} strokeWidth={2.3} />
                    </div>
                    <div>
                      <h3 className={`${styles.featureTitle} ${styles.securityFeatureTitle}`}>
                        Encryption by Default
                      </h3>
                      <p className={`${styles.featureBody} ${styles.securityFeatureBody}`}>
                        All data is encrypted in transit and at rest using modern
                        platform defaults. Every integration follows least-privilege
                        principles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.securityCard}>
                <div className={styles.securityMockRow}>
                  <span className={styles.securityMockArn}>
                    arn:aws:iam::123456789012:role/UnderflowCostExplorerRead
                  </span>
                  <span className={styles.securityMockBadge}>Active</span>
                </div>
                <div className={styles.securityProgress}>
                  <div className={styles.securityProgressBar} />
                </div>
                <div className={styles.securityPolicyBlock}>
                  <div className={styles.securityPolicyHeader}>Inline policy excerpt</div>
                  <pre className={styles.securityPolicyCode}>
                    <code>{`{
  "Effect": "Allow",
  "Action": ["ce:GetCostAndUsage"],
  "Resource": "*"
}`}</code>
                  </pre>
                </div>
                <p className={styles.securityFine}>
                  Underflow adheres to the AWS Well-Architected Framework for security
                  and cost optimization.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.stepsHeader}>
              <h2 className={styles.sectionTitle}>Engineered for Visibility</h2>
            </div>
            <div className={styles.visibilityGrid}>
              <article className={`${styles.visibilityCard} ${styles.visibilityLarge}`}>
                <div className={styles.visibilityContent}>
                  <h3 className={styles.featureTitle}>Service-Level Breakdown</h3>
                  <p className={styles.featureBody} style={{ maxWidth: "22rem" }}>
                    Drill down into S3, EC2, or RDS. See which specific services are
                    eating your budget and where the trend is moving next.
                  </p>
                </div>
                <div className={styles.visibilityCostSurface}>
                  <CostMiniSurface />
                </div>
              </article>
              <article className={`${styles.visibilityCard} ${styles.visibilityTall}`}>
                <div className={styles.visibilityBadgeIcon}>
                  <BellRing size={22} strokeWidth={2.2} />
                </div>
                <div className={styles.visibilityContent}>
                  <h3 className={`${styles.featureTitle} ${styles.visibilityTallTitle}`}>
                    Budget Alerts
                  </h3>
                  <p className={`${styles.featureBody} ${styles.visibilityTallBody}`}>
                    Instant email alerts when you hit the thresholds your team actually
                    cares about.
                  </p>
                </div>
                <div className={styles.visibilityTallSurface}>
                  <AlertMiniSurface />
                </div>
              </article>
              <article className={`${styles.visibilityCard} ${styles.visibilitySmall}`}>
                <div className={styles.visibilityContent}>
                  <h3 className={styles.featureTitle}>Trend Analysis</h3>
                  <p className={styles.featureBody}>
                    Compare workspaces, track account coverage, and understand how your
                    cloud footprint is evolving.
                  </p>
                </div>
                <div className={styles.visibilityInsetSurface}>
                  <WorkspaceMiniSurface />
                </div>
              </article>
              <article className={`${styles.visibilityCard} ${styles.visibilityWide}`}>
                <div className={styles.visibilityContent}>
                  <h3 className={styles.featureTitle}>Account Onboarding That Stays Clear</h3>
                  <p className={styles.featureBody}>
                    Guide teams through IAM role setup, account verification, and sync
                    readiness without burying the operational details.
                  </p>
                </div>
                <div className={styles.visibilityWideSurface}>
                  <AwsOnboardingMiniSurface />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.pricingSection} id="pricing">
          <div className={styles.sectionInner} style={{ maxWidth: "920px" }}>
            <div className={styles.pricingCard}>
              <div className={styles.pricingGlow} />
              <h2 className={styles.pricingTitle}>Simple, Transparent Pricing</h2>
              <p className={styles.pricingLead}>Free during public beta</p>
              <p className={styles.pricingBody}>
                Join the engineers already using Underflow to tame AWS spend. No credit
                card required while we continue shipping the public beta.
              </p>
              <Link to="/signup">
                <Button className={styles.heroPrimary} size="lg">
                  Get Started for Free
                </Button>
              </Link>
              <p className={styles.pricingFine}>
                Usage limits and paid tiers can stay disabled until you are ready to
                onboard the first real cohort.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMeta}>
            <span className={styles.brand}>{appConfig.appName}</span>
            <p className={styles.footerFine}>
              © 2026 Underflow AWS Cost Monitor. Precision transparency for modern cloud
              teams.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <strong>Product</strong>
              <a href="#product">Features</a>
              <a href="#security">Security</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className={styles.footerCol}>
              <strong>Resources</strong>
              <a href="#product">Documentation</a>
              <a href="#product">Blog</a>
              <a href="#product">API Reference</a>
            </div>
            <div className={styles.footerCol}>
              <strong>Company</strong>
              <a href="#security">Privacy</a>
              <a href="#security">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
