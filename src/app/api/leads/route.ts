import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LeadCreateSchema } from "@/lib/validation";
import { enrichLead } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qualified = url.searchParams.get("qualified");
  const sort = url.searchParams.get("sort"); // score_desc | score_asc | created_desc

  const where =
    qualified === "true" ? { qualified: true } : qualified === "false" ? { qualified: false } : {};

  const orderBy =
    sort === "score_asc"
      ? [{ score: "asc" as const }, { createdAt: "desc" as const }]
      : sort === "score_desc"
      ? [{ score: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const leads = await prisma.lead.findMany({ where, orderBy });
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Bonus rate limiting
  try {
    const rl = rateLimitOrThrow(ip, { limit: 20, windowMs: 60_000 });
    // You can return these headers for visibility
    // (Not required, but nice)
    // We'll attach them at the end.
    const body = await req.json().catch(() => null);
    const parsed = LeadCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400, headers: { "x-ratelimit-remaining": String(rl.remaining) } }
      );
    }

    const { name, email, website } = parsed.data;

    // Store first (must succeed even if enrichment fails)
    let lead;
    try {
      lead = await prisma.lead.create({
        data: { name, email, website },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "DUPLICATE_EMAIL", message: "A lead with this email already exists." },
          { status: 409, headers: { "x-ratelimit-remaining": String(rl.remaining) } }
        );
      }
      throw e;
    }

    // Best-effort enrichment (graceful failure)
    const { enrichment, error: enrichmentError } = await enrichLead({ name, email, website });

    // Score using what we have (even if enrichment partially failed)
    const scoring = scoreLead({ website, enrichment });

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...enrichment,
        score: scoring.score,
        qualified: scoring.qualified,
        enrichmentError: enrichmentError ?? null,
      },
    });

    return NextResponse.json(
      { lead: updated, scoring },
      {
        status: 201,
        headers: {
          "x-ratelimit-remaining": String(rl.remaining),
          "x-ratelimit-limit": String(rl.limit),
        },
      }
    );
} catch (error: unknown) {
  const apiError = error as {
    message?: string;
    retryAfterSec?: number;
    stack?: string;
  };

  if (apiError.message === "RATE_LIMITED") {
    const retryAfterSec = apiError.retryAfterSec ?? 60;

    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "x-ratelimit-remaining": "0",
        },
      }
    );
  }

  console.error("POST /api/leads failed:", error);

  return NextResponse.json(
    {
      error: "SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : (apiError.stack ?? apiError.message ?? String(error)),
    },
    { status: 500 }
  );
}

}
