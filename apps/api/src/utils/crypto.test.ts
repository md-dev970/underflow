import test from "node:test";
import assert from "node:assert/strict";

import { generateOpaqueToken, hashToken } from "./crypto.js";

test("hashToken is deterministic", () => {
  assert.equal(hashToken("same-value"), hashToken("same-value"));
});

test("generateOpaqueToken returns unique values", () => {
  const first = generateOpaqueToken();
  const second = generateOpaqueToken();

  assert.notEqual(first, second);
  assert.ok(first.length > 0);
  assert.ok(second.length > 0);
});
