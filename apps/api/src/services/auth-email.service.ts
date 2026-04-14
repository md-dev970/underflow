import { env } from "../config/env.js";
import { emailService } from "./email.service.js";

const buildResetPasswordUrl = (token: string): string =>
  `${env.CLIENT_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

export const authEmailService = {
  async sendPasswordResetEmail(input: {
    email: string;
    firstName: string;
    token: string;
  }): Promise<void> {
    const resetUrl = buildResetPasswordUrl(input.token);
    const subject = "Reset your Underflow password";
    const text = [
      `Hi ${input.firstName},`,
      "",
      "We received a request to reset your Underflow password.",
      `Reset it here: ${resetUrl}`,
      "",
      `This link expires in ${env.PASSWORD_RESET_EXPIRES_IN_MINUTES} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    const html = `
      <p>Hi ${input.firstName},</p>
      <p>We received a request to reset your Underflow password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in ${env.PASSWORD_RESET_EXPIRES_IN_MINUTES} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    await emailService.sendEmail({
      to: input.email,
      from: env.AUTH_EMAIL_FROM,
      subject,
      text,
      html,
    });
  },
};
