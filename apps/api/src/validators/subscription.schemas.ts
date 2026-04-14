import { z } from "zod";

export const checkoutSessionSchema = z.object({
  priceId: z.string().trim().min(1),
});
