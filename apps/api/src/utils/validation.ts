import { ZodError, type ZodType } from "zod";

import { AppError } from "./app-error.js";

export const validate = <T>(schema: ZodType<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("Validation failed", 400, error.flatten(), "validation_failed");
    }

    throw error;
  }
};
