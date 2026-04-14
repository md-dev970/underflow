import { useEffect, useMemo, useState, type FormEvent } from "react";

import { InlineAlert } from "../../components/feedback/Feedback";
import { Button } from "../../components/forms/Button";
import { Input, PasswordInput, Select, Switch } from "../../components/forms/Fields";
import { PageHeader } from "../../components/layout/Sections";
import { useAuth } from "../../features/auth";
import { useToast } from "../../features/toast";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDateTime } from "../../lib/format";
import { usersApi } from "../../lib/api/users";
import type { UserNotificationPreferences, UserSession } from "../../types/api";
import styles from "./profile-settings-page.module.css";

interface EmailPreferencesState {
  costAlerts: boolean;
  driftReports: boolean;
  maintenance: boolean;
  featureReleases: boolean;
}

const timezoneOptions = [
  "UTC-8 (Pacific Time)",
  "UTC-5 (Eastern Time)",
  "UTC+0 (Greenwich Mean Time)",
  "UTC+1 (Central European Time)",
  "UTC+3 (East Africa Time)",
];

const defaultPreferences: EmailPreferencesState = {
  costAlerts: true,
  driftReports: true,
  maintenance: false,
  featureReleases: true,
};

const toPreferenceState = (
  preferences: UserNotificationPreferences,
): EmailPreferencesState => ({
  costAlerts: preferences.costAlerts,
  driftReports: preferences.driftReports,
  maintenance: preferences.maintenance,
  featureReleases: preferences.featureReleases,
});

export const ProfileSettingsPage = (): JSX.Element => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    designation: "Platform Lead",
    timezone: "UTC+1 (Central European Time)",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailPreferences, setEmailPreferences] =
    useState<EmailPreferencesState>(defaultPreferences);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);

  const preferencesQuery = useAsyncData(
    async () => {
      const result = await usersApi.getPreferences();
      return result.preferences;
    },
    [],
  );

  const sessionsQuery = useAsyncData(
    async () => {
      const result = await usersApi.getSessions();
      return result.sessions;
    },
    [],
  );

  useEffect(() => {
    if (preferencesQuery.data) {
      setEmailPreferences(toPreferenceState(preferencesQuery.data));
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    if (user) {
      setProfile((current) => ({
        ...current,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
      }));
    }
  }, [user]);

  const fullName = useMemo(() => {
    const value = `${profile.firstName} ${profile.lastName}`.trim();
    return value || "Underflow User";
  }, [profile.firstName, profile.lastName]);

  const initials = useMemo(() => {
    const source = fullName.split(" ").filter(Boolean).slice(0, 2);
    return source.map((part) => part[0]?.toUpperCase() ?? "").join("") || "UF";
  }, [fullName]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSavingProfile(true);

    try {
      const result = await usersApi.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || null,
      });
      setUser(result.user);
      showToast({ title: "Profile updated", tone: "success" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.newPassword !== password.confirmPassword) {
      setError("New password and confirmation must match");
      return;
    }

    setIsSavingPassword(true);

    try {
      await usersApi.updatePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast({ title: "Password updated", tone: "success" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handlePreferencesSave = async () => {
    setError(null);
    setIsSavingPreferences(true);

    try {
      const result = await usersApi.updatePreferences(emailPreferences);
      setEmailPreferences(toPreferenceState(result.preferences));
      showToast({ title: "Email preferences updated", tone: "success" });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to update preferences",
      );
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleLogoutOthers = async () => {
    setError(null);
    setIsLoggingOutOthers(true);

    try {
      await usersApi.logoutOtherSessions();
      await sessionsQuery.reload();
      showToast({ title: "Other sessions logged out", tone: "success" });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to log out other sessions",
      );
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);

    try {
      await usersApi.revokeSession(sessionId);
      await sessionsQuery.reload();
      showToast({ title: "Session revoked", tone: "success" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to revoke session");
    }
  };

  const updatePreference = (key: keyof EmailPreferencesState, value: boolean) => {
    setEmailPreferences((current) => ({ ...current, [key]: value }));
  };

  const sessions = sessionsQuery.data ?? [];
  const currentSession = sessions.find((session) => session.isCurrent) ?? null;
  const otherSessions = sessions.filter((session) => !session.isCurrent);

  return (
    <div className={styles.page}>
      <PageHeader
        description="Manage your account preferences, security credentials, and communication settings across the Underflow platform."
        title="User Settings"
      />

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <div className={styles.grid}>
        <form className={styles.profileCard} onSubmit={handleProfileSubmit}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Profile Information</h2>
              <p className={styles.cardDescription}>
                Update your personal details and how you appear to others.
              </p>
            </div>
            <Button disabled={isSavingProfile} type="submit">
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className={styles.profileBody}>
            <div className={styles.avatarColumn}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>{initials}</div>
                <button className={styles.avatarEdit} type="button">
                  Edit
                </button>
              </div>
              <span className={styles.avatarLabel}>Avatar</span>
            </div>

            <div className={styles.profileFields}>
              <div className={styles.doubleField}>
                <Input
                  label="First Name"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, firstName: event.target.value }))
                  }
                  value={profile.firstName}
                />
                <Input
                  label="Last Name"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, lastName: event.target.value }))
                  }
                  value={profile.lastName}
                />
              </div>

              <div className={styles.doubleField}>
                <Input label="Email Address" readOnly value={user?.email ?? ""} />
                <Input
                  label="Phone"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, phone: event.target.value }))
                  }
                  value={profile.phone}
                />
              </div>

              <div className={styles.doubleField}>
                <Input
                  label="Designation"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, designation: event.target.value }))
                  }
                  value={profile.designation}
                />
                <Select
                  label="Timezone"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, timezone: event.target.value }))
                  }
                  value={profile.timezone}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </form>

        <section className={styles.sessionsCard}>
          <div className={styles.cardIntro}>
            <h2 className={styles.cardTitle}>Sessions</h2>
            <p className={styles.cardDescription}>Active devices currently logged in.</p>
          </div>

          {sessionsQuery.error ? <InlineAlert tone="danger">{sessionsQuery.error}</InlineAlert> : null}

          <div className={styles.sessionList}>
            {currentSession ? (
              <div className={styles.sessionCurrent}>
                <div className={styles.sessionIcon}>{currentSession.deviceLabel.slice(0, 2).toUpperCase()}</div>
                <div className={styles.sessionContent}>
                  <strong>{currentSession.deviceLabel}</strong>
                  <span>
                    {currentSession.ipAddress ?? "Unknown location"} - Current session - Last used{" "}
                    {formatDateTime(currentSession.lastUsedAt)}
                  </span>
                </div>
              </div>
            ) : null}

            {otherSessions.map((session: UserSession) => (
              <div className={styles.sessionItem} key={session.id}>
                <div className={styles.sessionIcon}>{session.deviceLabel.slice(0, 2).toUpperCase()}</div>
                <div className={styles.sessionContent}>
                  <strong>{session.deviceLabel}</strong>
                  <span>
                    {session.ipAddress ?? "Unknown location"} - Last used{" "}
                    {formatDateTime(session.lastUsedAt)}
                  </span>
                </div>
                <button
                  className={styles.sessionClose}
                  onClick={() => void handleRevokeSession(session.id)}
                  type="button"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <button
            className={styles.logoutOthers}
            onClick={() => void handleLogoutOthers()}
            type="button"
          >
            {isLoggingOutOthers ? "Logging out..." : "Logout all other sessions"}
          </button>
        </section>

        <form className={styles.securityCard} onSubmit={handlePasswordSubmit}>
          <div className={styles.cardIntro}>
            <h2 className={styles.cardTitle}>Security</h2>
            <p className={styles.cardDescription}>
              Keep your account secure with a strong password.
            </p>
          </div>

          <div className={styles.formStack}>
            <PasswordInput
              label="Current Password"
              onChange={(event) =>
                setPassword((current) => ({ ...current, currentPassword: event.target.value }))
              }
              placeholder="Current password"
              value={password.currentPassword}
            />
            <PasswordInput
              hint="Minimum 12 characters recommended."
              label="New Password"
              onChange={(event) =>
                setPassword((current) => ({ ...current, newPassword: event.target.value }))
              }
              placeholder="Minimum 12 characters"
              value={password.newPassword}
            />
            <PasswordInput
              label="Confirm New Password"
              onChange={(event) =>
                setPassword((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              placeholder="Repeat your new password"
              value={password.confirmPassword}
            />
            <Button disabled={isSavingPassword} type="submit" variant="secondary">
              {isSavingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>

        <section className={styles.preferencesCard}>
          <div className={styles.preferenceHeader}>
            <div>
              <h2 className={styles.cardTitle}>Email Preferences</h2>
              <p className={styles.cardDescription}>
                Choose which updates you'd like to receive in your inbox.
              </p>
            </div>
            <span className={styles.preferenceBadge}>Global Sync On</span>
          </div>

          {preferencesQuery.error ? (
            <InlineAlert tone="danger">{preferencesQuery.error}</InlineAlert>
          ) : null}

          <div className={styles.preferenceList}>
            <div className={styles.preferenceRow}>
              <div>
                <strong>Cost Threshold Alerts</strong>
                <p>Receive an email when costs exceed 80% of your daily budget.</p>
              </div>
              <Switch
                checked={emailPreferences.costAlerts}
                label=""
                onChange={(value) => updatePreference("costAlerts", value)}
              />
            </div>
            <div className={styles.preferenceRow}>
              <div>
                <strong>Infrastructure Drift</strong>
                <p>Weekly summaries of changes made outside of Terraform.</p>
              </div>
              <Switch
                checked={emailPreferences.driftReports}
                label=""
                onChange={(value) => updatePreference("driftReports", value)}
              />
            </div>
            <div className={styles.preferenceRow}>
              <div>
                <strong>System Maintenance</strong>
                <p>Notifications about Underflow's planned system upgrades.</p>
              </div>
              <Switch
                checked={emailPreferences.maintenance}
                label=""
                onChange={(value) => updatePreference("maintenance", value)}
              />
            </div>
            <div className={styles.preferenceRow}>
              <div>
                <strong>Feature Releases</strong>
                <p>Stay up to date with the latest platform enhancements.</p>
              </div>
              <Switch
                checked={emailPreferences.featureReleases}
                label=""
                onChange={(value) => updatePreference("featureReleases", value)}
              />
            </div>
          </div>

          <div className={styles.preferenceFooter}>
            <Button
              disabled={isSavingPreferences}
              onClick={() => void handlePreferencesSave()}
              type="button"
              variant="secondary"
            >
              {isSavingPreferences ? "Saving..." : "Save preferences"}
            </Button>
          </div>
        </section>
      </div>

      <section className={styles.dangerZone}>
        <div>
          <h2 className={styles.dangerTitle}>Danger Zone</h2>
          <p className={styles.dangerText}>
            Proceed with caution. Deleting your account will permanently wipe all cloud
            resource data.
          </p>
        </div>
        <Button type="button" variant="ghost">
          Request Account Deletion
        </Button>
      </section>
    </div>
  );
};
