import test from "node:test";
import assert from "node:assert/strict";

import type { NextFunction, Request, Response } from "express";

test("authMiddleware rejects requests without an authorization header", async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";

  const { authMiddleware } = await import("./auth.middleware.js");
  const req = {
    headers: {},
  } as Request;

  const nextCalls: unknown[] = [];

  authMiddleware(req, {} as Response, ((error?: unknown) => {
    nextCalls.push(error);
  }) as NextFunction);

  assert.equal(nextCalls.length, 1);
  assert.equal(
    (nextCalls[0] as { message: string }).message,
    "Authorization header is missing or invalid",
  );
});
