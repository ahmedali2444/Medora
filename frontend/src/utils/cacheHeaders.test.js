import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const publicHeaders = readFileSync(join(cwd(), "public", "_headers"), "utf8");

describe("deployment cache headers", () => {
  it("prevents cached SPA document responses on deep links", () => {
    expect(publicHeaders).toContain("/*");
    expect(publicHeaders).toMatch(/\/\*\s+Cache-Control: no-cache, no-store, must-revalidate/s);
  });

  it("keeps hashed assets immutable", () => {
    expect(publicHeaders).toMatch(/\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/s);
  });
});
