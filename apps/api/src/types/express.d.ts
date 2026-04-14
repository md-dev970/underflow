import type { AuthenticatedUser } from "./auth.types.js";

declare global {
  namespace Express {
    interface Locals {
      rawBody?: Buffer;
    }

    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
