import { AppError } from "./app-error.js";

export const requireRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`Missing route parameter: ${name}`, 400);
  }

  return value;
};
