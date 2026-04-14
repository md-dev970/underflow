import { pool } from "../config/db.js";
import type { UserNotificationPreferences } from "../types/auth.types.js";

const mapPreferences = (
  row: Record<string, unknown>,
): UserNotificationPreferences => ({
  costAlerts: Boolean(row.cost_alerts),
  driftReports: Boolean(row.drift_reports),
  maintenance: Boolean(row.maintenance),
  featureReleases: Boolean(row.feature_releases),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const userPreferencesRepository = {
  async getOrCreate(userId: string): Promise<UserNotificationPreferences> {
    await pool.query(
      `INSERT INTO user_notification_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );

    const result = await pool.query(
      `SELECT cost_alerts, drift_reports, maintenance, feature_releases, created_at, updated_at
       FROM user_notification_preferences
       WHERE user_id = $1`,
      [userId],
    );

    return mapPreferences(result.rows[0] as Record<string, unknown>);
  },

  async update(
    userId: string,
    input: {
      costAlerts: boolean;
      driftReports: boolean;
      maintenance: boolean;
      featureReleases: boolean;
    },
  ): Promise<UserNotificationPreferences> {
    const result = await pool.query(
      `INSERT INTO user_notification_preferences (
         user_id,
         cost_alerts,
         drift_reports,
         maintenance,
         feature_releases
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         cost_alerts = EXCLUDED.cost_alerts,
         drift_reports = EXCLUDED.drift_reports,
         maintenance = EXCLUDED.maintenance,
         feature_releases = EXCLUDED.feature_releases,
         updated_at = NOW()
       RETURNING cost_alerts, drift_reports, maintenance, feature_releases, created_at, updated_at`,
      [
        userId,
        input.costAlerts,
        input.driftReports,
        input.maintenance,
        input.featureReleases,
      ],
    );

    return mapPreferences(result.rows[0] as Record<string, unknown>);
  },
};
