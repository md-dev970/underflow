import { z } from "zod";

export const createAwsAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  awsAccountId: z.string().trim().regex(/^\d{12}$/),
  roleArn: z
    .string()
    .trim()
    .regex(/^arn:aws:iam::\d{12}:role\/[\w+=,.@\-_/]+$/),
  externalId: z.string().trim().min(1).max(255).optional(),
}).partial({ roleArn: true });

export const updateAwsAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  awsAccountId: z.string().trim().regex(/^\d{12}$/),
  roleArn: z
    .string()
    .trim()
    .regex(/^arn:aws:iam::\d{12}:role\/[\w+=,.@\-_/]+$/),
  externalId: z.string().trim().min(1).max(255).nullable().optional(),
}).partial({ roleArn: true });

export const costQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  awsAccountId: z.string().uuid().optional(),
});

export const syncAwsAccountSchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine(
    (value) =>
      (value.from === undefined && value.to === undefined) ||
      (value.from !== undefined && value.to !== undefined),
    {
      message: "from and to must be provided together",
    },
  );

export const syncHistoryQuerySchema = z.object({
  awsAccountId: z.string().uuid().optional(),
  status: z.string().trim().min(1).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
