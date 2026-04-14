import { z } from "zod";

export const updateCurrentUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().min(1).max(30).nullable().optional(),
    avatarUrl: z.string().trim().url().nullable().optional(),
  })
  .refine(
    (value) =>
      value.firstName !== undefined ||
      value.lastName !== undefined ||
      value.phone !== undefined ||
      value.avatarUrl !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const updateNotificationPreferencesSchema = z.object({
  costAlerts: z.boolean(),
  driftReports: z.boolean(),
  maintenance: z.boolean(),
  featureReleases: z.boolean(),
});
