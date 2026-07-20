import { parse as parseDomain } from "tldts";
import dns from "node:dns/promises";

export type LeadEnrichment = {
  companyDomain?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  country?: string;

  // AnyMail Finder
  emailStatus?: string;
  domainEmailCount?: number;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

function rootDomainFromUrlOrEmail(website?: string, email?: string): string | undefined {
  const fromWebsite = (() => {
    if (!website) return undefined;
    try {
      const u = new URL(website);
      const parsed = parseDomain(u.hostname);
      return parsed.domain ? parsed.domain : u.hostname.replace(/^www\./i, "");
    } catch {
      return undefined;
    }
  })();

  if (fromWebsite) return fromWebsite;

  if (email?.includes("@")) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return undefined;
    const parsed = parseDomain(domain);
    return parsed.domain ? parsed.domain : domain;
  }

  return undefined;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const timeoutMs = init.timeoutMs ?? 5000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function sizeFromEmailCount(emailCount?: number): string | undefined {
  if (emailCount == null || Number.isNaN(emailCount)) return undefined;
  // Assumption: more indexed emails roughly correlates with larger org size
  if (emailCount < 50) return "1-10";
  if (emailCount < 200) return "11-50";
  if (emailCount < 1000) return "51-200";
  if (emailCount < 5000) return "201-1000";
  return "1000+";
}

async function countryFromDomainViaIp(domain: string): Promise<string | undefined> {
  try {
    const lookup = await dns.lookup(domain);
    const ip = lookup.address;
    // ipwho.is returns country + country_code, no key required
    const res = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeoutMs: 4000 });
    if (!res.ok) return undefined;
    const data = (await res.json()) as any;
    if (data?.success === false) return undefined;
    const code = (data?.country_code as string | undefined)?.toUpperCase();
    return code || undefined;
  } catch {
    return undefined;
  }
}

async function companyNameFromClearbit(domain: string): Promise<string | undefined> {
  try {
    const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(domain)}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 4000 });
    if (!res.ok) return undefined;
    const suggestions = (await res.json()) as Array<{ name?: string; domain?: string }>;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return undefined;

    // Prefer an exact domain match if present
    const exact = suggestions.find((s) => s.domain?.toLowerCase() === domain.toLowerCase());
    return (exact?.name ?? suggestions[0]?.name)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function anymailVerifyEmail(email: string, apiKey: string): Promise<string | undefined> {
  const res = await fetchWithTimeout("https://api.anymailfinder.com/v5.1/verify-email", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    timeoutMs: 8000,
  });

  if (!res.ok) throw new Error(`AnyMail verify-email failed: ${res.status}`);
  const data = (await res.json()) as any;
  return typeof data?.email_status === "string" ? data.email_status : undefined;
}

async function anymailDomainEmailCount(domain: string, apiKey: string): Promise<number | undefined> {
  const res = await fetchWithTimeout(`https://api.anymailfinder.com/v5.1/domain/${encodeURIComponent(domain)}/email`, {
    method: "GET",
    headers: { Authorization: apiKey },
    timeoutMs: 8000,
  });

  if (!res.ok) throw new Error(`AnyMail domain email count failed: ${res.status}`);
  const data = (await res.json()) as any;
  const count = data?.email_count;
  return typeof count === "number" ? count : undefined;
}

export async function enrichLead(input: {
  name: string;
  email: string;
  website?: string;
}): Promise<{ enrichment: LeadEnrichment; error?: string }> {
  const enrichment: LeadEnrichment = {};

  const apiKey = process.env.ANYMAILFINDER_API_KEY;
  const domain = rootDomainFromUrlOrEmail(input.website, input.email);

  if (domain) {
    enrichment.companyDomain = domain;

    // Optional free-ish enrichment sources
    const [companyName, country] = await Promise.all([
      companyNameFromClearbit(domain),
      countryFromDomainViaIp(domain),
    ]);
    if (companyName) enrichment.companyName = companyName;
    if (country) enrichment.country = country;
  }

  // If no API key, return what we could infer
  if (!apiKey) {
    return {
      enrichment: {
        ...enrichment,
        companySize: enrichment.companySize,
      },
      error: "ANYMAILFINDER_API_KEY not set; skipped AnyMail Finder enrichment.",
    };
  }

  try {
    // Verify provided email (0.2 credits per docs)
    enrichment.emailStatus = await anymailVerifyEmail(input.email, apiKey);

    // Domain email count is free per docs (and we use it as a proxy for company size)
    if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
      const count = await anymailDomainEmailCount(domain, apiKey);
      enrichment.domainEmailCount = count;
      enrichment.companySize = sizeFromEmailCount(count);
    }

    return { enrichment };
  } catch (e: any) {
    return {
      enrichment,
      error: e?.message ? String(e.message) : "Unknown enrichment error",
    };
  }
}
