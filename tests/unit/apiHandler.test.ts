import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { forbidden } from "@/lib/api/errors";
import { handle } from "@/lib/api/handler";

const call = (fn: () => Promise<Response>) => handle(async () => fn())(new Request("http://x"), undefined);

describe("handle()", () => {
  it("maps ApiError to the standard envelope", async () => {
    const res = await call(async () => {
      throw forbidden();
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("maps Zod errors to 400 VALIDATION_ERROR with field paths", async () => {
    const res = await call(async () => {
      z.object({ code: z.string().regex(/^\d{6}$/) }).parse({ code: "abc" });
      return new Response();
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].path).toBe("code");
  });

  it("hides internal error details from clients", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(async () => {
      throw new Error("password=hunter2 connection string leaked");
    });
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("hunter2");
    spy.mockRestore();
  });
});
