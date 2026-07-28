import { describe, it, expect } from "vitest";
import { LIMITS } from "../../src/security/limits";
import { redactError, redactObject } from "../../src/security/redaction";

describe("LIMITS", () => {
  it("defines positive limits for every configured resource", () => {
    for (const [key, value] of Object.entries(LIMITS)) {
      expect(value, key).toBeGreaterThan(0);
    }
  });
});

describe("redactError", () => {
  it("redacts secrets from an Error message", () => {
    const err = new Error("failed with token=abc123secretvalue");
    expect(redactError(err)).toContain("[REDACTED]");
    expect(redactError(err)).not.toContain("abc123secretvalue");
  });
});

describe("redactObject", () => {
  it("redacts secrets in string values only", () => {
    const input = { message: "key=verysecretvalue1234", count: 3, nested: true };
    const result = redactObject(input);
    expect(result.message).toContain("[REDACTED]");
    expect(result.count).toBe(3);
    expect(result.nested).toBe(true);
  });
});
