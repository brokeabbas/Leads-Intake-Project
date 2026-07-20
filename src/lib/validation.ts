import { z } from "zod";

export const LeadCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Invalid email address").max(254),
  website: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().url("Website must be a valid URL (include https://)").optional()
    ),
});

export type LeadCreateInput = z.infer<typeof LeadCreateSchema>;
