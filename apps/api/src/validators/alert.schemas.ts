import { z } from "zod";

export const createBudgetAlertSchema = z.object({
  name: z.string().trim().min(1).max(255),
  thresholdAmount: z.number().positive(),
  currency: z.string().trim().min(3).max(10).optional(),
  period: z.enum(["monthly", "daily"]).optional(),
  recipientEmail: z.string().trim().email(),
  awsAccountId: z.string().uuid().optional(),
});

export const updateBudgetAlertSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    thresholdAmount: z.number().positive().optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    period: z.enum(["monthly", "daily"]).optional(),
    recipientEmail: z.string().trim().email().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.thresholdAmount !== undefined ||
      value.currency !== undefined ||
      value.period !== undefined ||
      value.recipientEmail !== undefined ||
      value.isActive !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
