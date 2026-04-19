import "dotenv/config";

import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const demoUser = {
  email: "john.doe@underflow.demo",
  password: "DemoPass123!",
  firstName: "John",
  lastName: "Doe",
  phone: "+1 415 555 0142",
  role: "customer",
};

const workspaces = [
  {
    slug: "demo-core-platform",
    name: "Core Platform",
    accounts: [
      {
        name: "Production",
        awsAccountId: "482715903114",
        status: "verified",
        services: {
          "Amazon EC2": 185.4,
          "Amazon RDS": 132.7,
          "Amazon S3": 58.2,
          "AWS Lambda": 34.8,
          "Amazon CloudFront": 48.5,
          "Amazon ElastiCache": 39.6,
        },
      },
      {
        name: "Staging",
        awsAccountId: "482715903115",
        status: "verified",
        services: {
          "Amazon EC2": 72.2,
          "Amazon RDS": 40.5,
          "Amazon S3": 24.1,
          "AWS Lambda": 16.6,
          "Amazon CloudFront": 11.7,
          "Amazon EKS": 36.3,
        },
      },
      {
        name: "Sandbox",
        awsAccountId: "482715903116",
        status: "pending",
        services: {
          "Amazon EC2": 18.9,
          "Amazon S3": 9.8,
          "AWS Lambda": 12.1,
          "Amazon CloudWatch": 7.6,
          "NAT Gateway": 14.4,
        },
      },
    ],
    alerts: [
      {
        name: "Workspace monthly burn",
        thresholdAmount: 14500,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: null,
      },
      {
        name: "Production compute surge",
        thresholdAmount: 6200,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: 0,
      },
    ],
  },
  {
    slug: "demo-growth-analytics",
    name: "Growth Analytics",
    accounts: [
      {
        name: "Data Warehouse",
        awsAccountId: "715209438221",
        status: "verified",
        services: {
          "Amazon Redshift": 224.5,
          "Amazon S3": 88.4,
          "AWS Glue": 57.9,
          "Amazon Athena": 43.8,
          "AWS Lambda": 12.4,
        },
      },
      {
        name: "Attribution",
        awsAccountId: "715209438222",
        status: "verified",
        services: {
          "Amazon EC2": 61.4,
          "Amazon RDS": 51.9,
          "Amazon S3": 34.2,
          "Amazon CloudFront": 18.8,
          "Amazon OpenSearch Service": 66.1,
        },
      },
      {
        name: "Experimentation",
        awsAccountId: "715209438223",
        status: "verified",
        services: {
          "Amazon EC2": 47.2,
          "AWS Lambda": 38.1,
          "Amazon DynamoDB": 26.3,
          "Amazon S3": 13.4,
          "Amazon SNS": 9.2,
        },
      },
    ],
    alerts: [
      {
        name: "Warehouse spend ceiling",
        thresholdAmount: 9800,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: 0,
      },
      {
        name: "Analytics workspace budget",
        thresholdAmount: 18250,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: null,
      },
    ],
  },
  {
    slug: "demo-edge-labs",
    name: "Edge Labs",
    accounts: [
      {
        name: "Edge Compute",
        awsAccountId: "906144227301",
        status: "verified",
        services: {
          "Amazon CloudFront": 109.8,
          "AWS Lambda": 72.6,
          "Amazon Route 53": 12.8,
          "AWS WAF": 28.5,
          "Amazon S3": 19.7,
        },
      },
      {
        name: "Realtime APIs",
        awsAccountId: "906144227302",
        status: "verified",
        services: {
          "Amazon API Gateway": 64.4,
          "AWS Lambda": 58.8,
          "Amazon DynamoDB": 36.2,
          "Amazon CloudWatch": 18.3,
          "NAT Gateway": 21.6,
        },
      },
      {
        name: "EU Expansion",
        awsAccountId: "906144227303",
        status: "verified",
        services: {
          "Amazon EC2": 92.1,
          "Amazon RDS": 55.7,
          "Amazon CloudFront": 31.6,
          "Amazon S3": 26.4,
          "AWS Lambda": 14.8,
        },
      },
    ],
    alerts: [
      {
        name: "Latency platform watch",
        thresholdAmount: 8400,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: 1,
      },
      {
        name: "Edge workspace budget",
        thresholdAmount: 15600,
        period: "monthly",
        recipientEmail: demoUser.email,
        awsAccountIndex: null,
      },
    ],
  },
];

const dayCount = 120;
const standardRoleName = "UnderflowCostExplorerRead";

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const daysAgo = (count, from = new Date()) => {
  const value = new Date(from);
  value.setDate(value.getDate() - count);
  return value;
};

const weeksAgo = (count, from = new Date()) => {
  const value = new Date(from);
  value.setDate(value.getDate() - count * 7);
  return value;
};

const monthsFromNow = (count, from = new Date()) => {
  const value = new Date(from);
  value.setMonth(value.getMonth() + count);
  return value;
};

const bounded = (value, minimum) => Math.max(value, minimum);

const generateDailyAmount = (base, dayOffset, accountSeed, serviceSeed) => {
  const weeklyWave = Math.sin((dayOffset + accountSeed) / 5.2) * 0.09;
  const longWave = Math.cos((dayOffset + serviceSeed) / 13.4) * 0.06;
  const trend = dayOffset < 20 ? 1.14 : dayOffset < 45 ? 1.06 : 0.98;
  const seedFactor = 1 + ((accountSeed * 7 + serviceSeed * 3) % 11) / 130;
  return Number((bounded(base * trend * seedFactor * (1 + weeklyWave + longWave), 0.35)).toFixed(2));
};

const createWorkspaceSummary = (accounts) => {
  const serviceTotals = new Map();

  for (const account of accounts) {
    for (const [serviceName, amount] of Object.entries(account.services)) {
      serviceTotals.set(serviceName, (serviceTotals.get(serviceName) ?? 0) + amount);
    }
  }

  return [...serviceTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([serviceName]) => serviceName);
};

const buildAlertEventKey = (alertId, index) => `${alertId}:demo:${index}`;

const seedDemo = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM users WHERE email = $1", [demoUser.email]);

    const passwordHash = await argon2.hash(demoUser.password);
    const userId = randomUUID();
    const now = new Date();

    await client.query(
      `INSERT INTO users (
         id,
         email,
         password_hash,
         first_name,
         last_name,
         phone,
         role,
         is_active,
         is_email_verified,
         password_changed_at,
         session_version,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, $8, 3, $9, $9)`,
      [
        userId,
        demoUser.email,
        passwordHash,
        demoUser.firstName,
        demoUser.lastName,
        demoUser.phone,
        demoUser.role,
        daysAgo(12, now),
        daysAgo(120, now),
      ],
    );

    await client.query(
      `INSERT INTO user_notification_preferences (
         user_id,
         cost_alerts,
         drift_reports,
         maintenance,
         feature_releases,
         created_at,
         updated_at
       )
       VALUES ($1, TRUE, TRUE, FALSE, TRUE, $2, $2)`,
      [userId, daysAgo(120, now)],
    );

    const subscriptionId = randomUUID();
    await client.query(
      `INSERT INTO subscriptions (
         id,
         user_id,
         stripe_customer_id,
         stripe_subscription_id,
         stripe_price_id,
         status,
         current_period_start,
         current_period_end,
         cancel_at_period_end,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, 'trialing', $6, $7, FALSE, $8, $8)`,
      [
        subscriptionId,
        userId,
        "cus_demo_john_doe",
        "sub_demo_john_doe",
        "price_demo_pro",
        daysAgo(6, now),
        monthsFromNow(1, now),
        daysAgo(120, now),
      ],
    );

    const paymentRows = [
      {
        amountCents: 4900,
        status: "succeeded",
        paidAt: daysAgo(36, now),
      },
      {
        amountCents: 4900,
        status: "succeeded",
        paidAt: daysAgo(6, now),
      },
    ];

    for (const payment of paymentRows) {
      await client.query(
        `INSERT INTO payments (
           id,
           user_id,
           subscription_id,
           stripe_payment_intent_id,
           amount_cents,
           currency,
           status,
           paid_at,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, 'usd', $6, $7, $7)`,
        [
          randomUUID(),
          userId,
          subscriptionId,
          `pi_demo_${randomUUID().slice(0, 8)}`,
          payment.amountCents,
          payment.status,
          payment.paidAt,
        ],
      );
    }

    const sessionRows = [
      {
        id: randomUUID(),
        label: "Chrome on macOS",
        ipAddress: "192.0.2.14",
        expiresAt: monthsFromNow(1, now),
        revokedAt: null,
        lastUsedAt: daysAgo(0, now),
      },
      {
        id: randomUUID(),
        label: "Safari on iPhone",
        ipAddress: "198.51.100.44",
        expiresAt: monthsFromNow(1, now),
        revokedAt: null,
        lastUsedAt: daysAgo(1, now),
      },
      {
        id: randomUUID(),
        label: "Firefox on Windows",
        ipAddress: "203.0.113.19",
        expiresAt: monthsFromNow(1, now),
        revokedAt: daysAgo(3, now),
        lastUsedAt: daysAgo(4, now),
      },
    ];

    for (const session of sessionRows) {
      await client.query(
        `INSERT INTO refresh_tokens (
           id,
           user_id,
           token_hash,
           user_agent,
           ip_address,
           last_used_at,
           expires_at,
           revoked_at,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          session.id,
          userId,
          `demo-token-${session.id}`,
          session.label,
          session.ipAddress,
          session.lastUsedAt,
          session.expiresAt,
          session.revokedAt,
          daysAgo(18, now),
        ],
      );
    }

    for (const [workspaceIndex, workspace] of workspaces.entries()) {
      const workspaceId = randomUUID();
      const workspaceCreatedAt = daysAgo(110 - workspaceIndex * 8, now);
      const workspaceUpdatedAt = daysAgo(2 + workspaceIndex, now);

      await client.query(
        `INSERT INTO workspaces (id, name, slug, owner_user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [workspaceId, workspace.name, workspace.slug, userId, workspaceCreatedAt, workspaceUpdatedAt],
      );

      await client.query(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'owner', $4)`,
        [randomUUID(), workspaceId, userId, workspaceCreatedAt],
      );

      const topWorkspaceServices = createWorkspaceSummary(workspace.accounts);
      const seededAccounts = [];

      for (const [accountIndex, account] of workspace.accounts.entries()) {
        const awsAccountId = randomUUID();
        const accountCreatedAt = daysAgo(95 - accountIndex * 9, now);
        const accountUpdatedAt = daysAgo(accountIndex + 1, now);
        const lastVerifiedAt = account.status === "verified" ? daysAgo(accountIndex + 1, now) : null;
        const lastSyncAt = account.status === "verified" ? daysAgo(accountIndex + 1, now) : null;

        await client.query(
          `INSERT INTO aws_accounts (
             id,
             workspace_id,
             name,
             aws_account_id,
             role_arn,
             external_id,
             status,
             last_verified_at,
             last_sync_at,
             created_at,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            awsAccountId,
            workspaceId,
            account.name,
            account.awsAccountId,
            `arn:aws:iam::${account.awsAccountId}:role/${standardRoleName}`,
            `underflow-demo-${workspaceIndex + 1}-${accountIndex + 1}`,
            account.status,
            lastVerifiedAt,
            lastSyncAt,
            accountCreatedAt,
            accountUpdatedAt,
          ],
        );

        seededAccounts.push({
          ...account,
          id: awsAccountId,
        });

        for (let dayOffset = 0; dayOffset < dayCount; dayOffset += 1) {
          const usageDate = toIsoDate(daysAgo(dayOffset, now));

          for (const [serviceIndex, [serviceName, baseAmount]] of Object.entries(account.services).entries()) {
            const amount = generateDailyAmount(baseAmount, dayOffset, accountIndex + 1, serviceIndex + 1);
            await client.query(
              `INSERT INTO cost_snapshots (
                 id,
                 workspace_id,
                 aws_account_id,
                 usage_date,
                 service_name,
                 amount,
                 currency,
                 created_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, 'USD', $7)`,
              [
                randomUUID(),
                workspaceId,
                awsAccountId,
                usageDate,
                serviceName,
                amount,
                daysAgo(dayOffset, now),
              ],
            );
          }
        }

        const syncRuns = [
          {
            status: "completed",
            startedAt: daysAgo(accountIndex + 1, now),
            finishedAt: daysAgo(accountIndex + 1, now),
            errorMessage: null,
          },
          {
            status: "completed",
            startedAt: daysAgo(accountIndex + 9, now),
            finishedAt: daysAgo(accountIndex + 9, now),
            errorMessage: null,
          },
          {
            status: accountIndex === 2 && workspaceIndex === 0 ? "failed" : "completed",
            startedAt: daysAgo(accountIndex + 17, now),
            finishedAt: daysAgo(accountIndex + 17, now),
            errorMessage:
              accountIndex === 2 && workspaceIndex === 0
                ? "Cost Explorer access was denied during a scheduled sync"
                : null,
          },
        ];

        for (const syncRun of syncRuns) {
          await client.query(
            `INSERT INTO cost_sync_runs (
               id,
               aws_account_id,
               status,
               started_at,
               finished_at,
               error_message
             )
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              randomUUID(),
              awsAccountId,
              syncRun.status,
              syncRun.startedAt,
              syncRun.finishedAt,
              syncRun.errorMessage,
            ],
          );
        }
      }

      for (const [alertIndex, alert] of workspace.alerts.entries()) {
        const alertId = randomUUID();
        const scopedAccount =
          alert.awsAccountIndex === null ? null : seededAccounts[alert.awsAccountIndex] ?? null;

        await client.query(
          `INSERT INTO budget_alerts (
             id,
             workspace_id,
             aws_account_id,
             name,
             threshold_amount,
             currency,
             period,
             recipient_email,
             is_active,
             created_at,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, 'USD', $6, $7, TRUE, $8, $8)`,
          [
            alertId,
            workspaceId,
            scopedAccount?.id ?? null,
            alert.name,
            alert.thresholdAmount,
            alert.period,
            alert.recipientEmail,
            daysAgo(32 - alertIndex * 5, now),
          ],
        );

        const observedSeries = [
          {
            observedAmount: Number((alert.thresholdAmount * 1.08).toFixed(2)),
            triggeredAt: daysAgo(4 + alertIndex, now),
            status: "triggered",
            notificationStatus: "sent",
            errorMessage: null,
          },
          {
            observedAmount: Number((alert.thresholdAmount * 1.16).toFixed(2)),
            triggeredAt: daysAgo(11 + alertIndex, now),
            status: "acknowledged",
            notificationStatus: alertIndex % 2 === 0 ? "sent" : "failed",
            errorMessage: alertIndex % 2 === 0 ? null : "Mailbox throttled temporary delivery",
          },
        ];

        for (const [eventIndex, event] of observedSeries.entries()) {
          const alertEventId = randomUUID();

          await client.query(
            `INSERT INTO alert_events (
               id,
               alert_id,
               workspace_id,
               aws_account_id,
               observed_amount,
               currency,
               triggered_at,
               status,
               event_key
             )
             VALUES ($1, $2, $3, $4, $5, 'USD', $6, $7, $8)`,
            [
              alertEventId,
              alertId,
              workspaceId,
              scopedAccount?.id ?? null,
              event.observedAmount,
              event.triggeredAt,
              event.status,
              buildAlertEventKey(alertId, eventIndex),
            ],
          );

          await client.query(
            `INSERT INTO notification_deliveries (
               id,
               alert_event_id,
               channel,
               recipient,
               status,
               sent_at,
               error_message,
               created_at
             )
             VALUES ($1, $2, 'email', $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              alertEventId,
              alert.recipientEmail,
              event.notificationStatus,
              event.notificationStatus === "sent" ? event.triggeredAt : null,
              event.errorMessage,
              event.triggeredAt,
            ],
          );
        }
      }

      if (topWorkspaceServices.length > 0) {
        const rollupAlertId = randomUUID();
        const rollupTriggeredAt = daysAgo(1 + workspaceIndex, now);
        const rollupEventId = randomUUID();
        const workspaceObservedAmount = Number(
          (
            workspace.accounts.reduce(
              (sum, account) =>
                sum +
                Object.values(account.services).reduce(
                  (inner, amount) => inner + amount,
                  0,
                ),
              0,
            ) * 1.03
          ).toFixed(2),
        );

        await client.query(
          `INSERT INTO budget_alerts (
             id,
             workspace_id,
             aws_account_id,
             name,
             threshold_amount,
             currency,
             period,
             recipient_email,
             is_active,
             created_at,
             updated_at
           )
           VALUES ($1, $2, NULL, $3, $4, 'USD', 'monthly', $5, TRUE, $6, $6)`,
          [
            rollupAlertId,
            workspaceId,
            `${workspace.name} executive watch`,
            Number((workspaceObservedAmount * 0.92).toFixed(2)),
            demoUser.email,
            daysAgo(20, now),
          ],
        );

        await client.query(
          `INSERT INTO alert_events (
             id,
             alert_id,
             workspace_id,
             aws_account_id,
             observed_amount,
             currency,
             triggered_at,
             status,
             event_key
           )
           VALUES ($1, $2, $3, NULL, $4, 'USD', $5, 'triggered', $6)`,
          [
            rollupEventId,
            rollupAlertId,
            workspaceId,
            workspaceObservedAmount,
            rollupTriggeredAt,
            `workspace-rollup:${workspaceId}`,
          ],
        );

        await client.query(
          `INSERT INTO notification_deliveries (
             id,
             alert_event_id,
             channel,
             recipient,
             status,
             sent_at,
             error_message,
             created_at
           )
           VALUES ($1, $2, 'email', $3, 'sent', $4, NULL, $4)`,
          [
            randomUUID(),
            rollupEventId,
            demoUser.email,
            rollupTriggeredAt,
          ],
        );
      }
    }

    await client.query("COMMIT");

    console.log("");
    console.log("Demo tenant seeded successfully.");
    console.log(`Email: ${demoUser.email}`);
    console.log(`Password: ${demoUser.password}`);
    console.log(`Workspaces: ${workspaces.length}`);
    console.log(`AWS accounts: ${workspaces.reduce((sum, workspace) => sum + workspace.accounts.length, 0)}`);
    console.log(`Alerts: ${workspaces.reduce((sum, workspace) => sum + workspace.alerts.length, 0)}`);
    console.log("");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedDemo().catch((error) => {
  console.error("Demo seed failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
