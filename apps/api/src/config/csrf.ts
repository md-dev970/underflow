import type { Request } from "express";
import { doubleCsrf } from "csrf-csrf";

import { env } from "./env.js";

const csrfCookieName = "underflow-csrf-token";

export const {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (req: Request) => {
    const userAgent = req.headers["user-agent"] ?? "unknown-user-agent";
    return `${req.ip}:${userAgent}`;
  },
  cookieName: csrfCookieName,
  cookieOptions: {
    httpOnly: true,
    sameSite:
      env.AUTH_COOKIE_SAME_SITE === "strict" ||
      env.AUTH_COOKIE_SAME_SITE === "none"
        ? env.AUTH_COOKIE_SAME_SITE
        : "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  },
  getCsrfTokenFromRequest: (req: Request) => {
    const header = req.headers["x-csrf-token"];
    return typeof header === "string" ? header : "";
  },
});
