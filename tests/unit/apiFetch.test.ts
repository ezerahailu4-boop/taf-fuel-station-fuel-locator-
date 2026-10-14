import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiClientError } from "@/lib/client/api";

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("does not double-stringify when body is already a JSON string", async () => {
    let capturedBody: unknown = null;

    globalThis.fetch = vi.fn(async (_url, opts) => {
      capturedBody = opts?.body;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const jsonString = JSON.stringify({ name: "TAF Bole" });
    await apiFetch("/api/test", { method: "POST", body: jsonString });

    expect(capturedBody).toBe(jsonString);
    // Ensure it was NOT converted to '"{\\"name\\":\\"TAF Bole\\"}"'
    expect(capturedBody).not.toBe(JSON.stringify(jsonString));
  });

  it("stringifies object bodies", async () => {
    let capturedBody: unknown = null;

    globalThis.fetch = vi.fn(async (_url, opts) => {
      capturedBody = opts?.body;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const obj = { name: "TAF Bole" };
    await apiFetch("/api/test", { method: "POST", body: obj });

    expect(capturedBody).toBe(JSON.stringify(obj));
  });

  it("surfaces validation error details in the error message", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: [{ path: "phone", message: "Invalid phone number" }],
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    await expect(apiFetch("/api/test", { method: "POST", body: {} })).rejects.toThrow(
      "Invalid input (phone: Invalid phone number)",
    );
  });
});
