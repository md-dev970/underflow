import assert from "node:assert/strict";
import test from "node:test";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5174";
  process.env.ALERT_EMAIL_FROM ??= "alerts@example.com";
};

test("sendAlertEmail records failed deliveries when the provider send fails", async () => {
  ensureTestEnv();

  const [
    { notificationService },
    { emailService },
    { notificationRepository },
  ] = await Promise.all([
    import("../services/notification.service.js"),
    import("../services/email.service.js"),
    import("../repositories/notification.repository.js"),
  ]);

  const originalSendEmail = emailService.sendEmail;
  const originalCreate = notificationRepository.create;
  let capturedStatus: string | null = null;

  emailService.sendEmail = async () => {
    throw new Error("SES unavailable");
  };
  notificationRepository.create = async (input) => {
    capturedStatus = input.status;
  };

  try {
    await notificationService.sendAlertEmail({
      alertEventId: "event-1",
      recipient: "alerts@example.com",
      subject: "Budget alert",
      body: "Threshold crossed",
    });

    assert.equal(capturedStatus, "failed");
  } finally {
    emailService.sendEmail = originalSendEmail;
    notificationRepository.create = originalCreate;
  }
});
