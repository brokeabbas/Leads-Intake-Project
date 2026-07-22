import { describe, expect, it } from "vitest";
import { scoreLead } from "./scoring";

describe("lead qualification", () => {
  it("qualifies a complete tier-one business lead", () => {
    const result = scoreLead({
      website: "https://example.com",
      enrichment: {
        companyDomain: "example.com",
        companyName: "Example Ltd",
        companySize: "11-50",
        country: "GB",
        emailStatus: "valid",
      },
    });

    expect(result.score).toBe(50);
    expect(result.qualified).toBe(true);
  });

  it("normalizes UK as a tier-one country", () => {
    const result = scoreLead({
      enrichment: {
        companyDomain: "example.co.uk",
        companyName: "Example Ltd",
        companySize: "1-10",
        country: "uk",
        emailStatus: "unknown",
      },
    });

    expect(result.reasons).toContain("+10 country tier-1");
  });

  it("penalizes incomplete enrichment", () => {
    const result = scoreLead({ enrichment: {} });

    expect(result.score).toBe(-15);
    expect(result.qualified).toBe(false);
  });
});
