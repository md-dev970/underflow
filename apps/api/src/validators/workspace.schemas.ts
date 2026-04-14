import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(255)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "At least one field must be provided",
  });
