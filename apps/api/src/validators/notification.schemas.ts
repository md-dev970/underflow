import { z } from "zod";

export const notificationQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  status: z.string().trim().min(1).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
