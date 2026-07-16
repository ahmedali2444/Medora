import { describe, expect, it } from "vitest";
import { createBuildRefreshUrl, stripBuildVersionParam } from "./buildRefresh";

describe("build refresh cache busting", () => {
  it("adds the build id to the current URL before refreshing", () => {
    expect(createBuildRefreshUrl("https://medora.test/services?lang=ar", "build-123")).toBe(
      "https://medora.test/services?lang=ar&__medora_v=build-123",
    );
  });

  it("removes the temporary cache-busting parameter after the new build loads", () => {
    expect(stripBuildVersionParam("https://medora.test/services?__medora_v=build-123&lang=ar")).toBe(
      "https://medora.test/services?lang=ar",
    );
  });
});
