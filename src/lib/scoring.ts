import type { LeadEnrichment } from "./enrichment";

export type ScoreResult = {
  score: number;
  qualified: boolean;
  reasons: string[];
};

export function scoreLead(input: { website?: string; enrichment: LeadEnrichment }): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Rule 1: Has website
  if (input.website) {
    score += 10;
    reasons.push("+10 website provided");
  }

  // Rule 2: Company size (derived from AnyMail domain email_count as a proxy)
  if (input.enrichment.companySize === "11-50") {
    score += 20;
    reasons.push("+20 company size 11–50");
  } else if (input.enrichment.companySize) {
    // small positive for having a size at all (signal quality)
    score += 5;
    reasons.push("+5 company size known");
  }

  // Rule 3: Country tier (US/UK/CA)
  const tier1 = new Set(["US", "GB", "UK", "CA"]);
  const c = input.enrichment.country?.toUpperCase();
  if (c && tier1.has(c === "UK" ? "GB" : c)) {
    score += 10;
    reasons.push("+10 country tier-1");
  }

  // Extra signal: verified email
  if (input.enrichment.emailStatus === "valid") {
    score += 10;
    reasons.push("+10 email status valid");
  }

  // Missing enrichment penalty
  const mustHave = ["companyDomain", "companyName", "companySize", "country", "emailStatus"] as const;
  const missingCount = mustHave.reduce((acc, k) => acc + (input.enrichment[k] ? 0 : 1), 0);
  if (missingCount > 0) {
    const penalty = Math.min(15, missingCount * 5);
    score -= penalty;
    reasons.push(`-${penalty} missing enrichment (${missingCount} fields)`);
  }

  const qualified = score >= 25;
  reasons.push(qualified ? "✅ qualified (score ≥ 25)" : "❌ unqualified (score < 25)");

  return { score, qualified, reasons };
}
