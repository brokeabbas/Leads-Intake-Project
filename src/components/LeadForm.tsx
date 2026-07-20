"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const FormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  website: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length === 0 || /^https?:\/\//i.test(v), {
      message: "Website must start with http:// or https://",
    }),
});

type FormValues = z.infer<typeof FormSchema>;

type ApiErrorPayload =
  | {
      error?: string;
      message?: string;
      retryAfterSec?: number;
      details?: any;
    }
  | null;

export default function LeadForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [scoring, setScoring] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", email: "", website: "" },
  });

  const submit = useMemo(
    () =>
      handleSubmit(async (values) => {
        setServerError(null);
        setServerSuccess(null);
        setScoring(null);

        const payload = {
          name: values.name,
          email: values.email,
          website: values.website?.trim() ? values.website.trim() : undefined,
        };

        let res: Response;

        try {
          res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e: any) {
          setServerError("Network error. Is the server running?");
          console.error("Fetch failed:", e);
          return;
        }

        // Robust parsing: JSON if possible, otherwise text
        const contentType = res.headers.get("content-type") ?? "";
        let data: ApiErrorPayload = null;

        if (contentType.includes("application/json")) {
          data = await res.json().catch(() => null);
        } else {
          const text = await res.text().catch(() => "");
          data = { message: text || undefined };
        }

        console.log("POST /api/leads response:", res.status, data);

        if (!res.ok) {
          if (data?.error === "DUPLICATE_EMAIL") {
            setServerError("Duplicate email: this lead already exists.");
            return;
          }
        
          if (data?.error === "VALIDATION_ERROR") {
            // show the most helpful server-side validation error
            const fieldErrors = data?.details?.fieldErrors ?? {};
            const firstField = Object.keys(fieldErrors)[0];
            const firstFieldMsg = firstField ? fieldErrors[firstField]?.[0] : null;
        
            setServerError(firstFieldMsg || data?.details?.formErrors?.[0] || "Validation failed. Check your inputs.");
            return;
          }
        
          if (data?.error === "RATE_LIMITED") {
            setServerError(`Rate limited. Retry in ~${data?.retryAfterSec ?? 10}s.`);
            return;
          }
        
          // ✅ Correct fallback order (no ternary precedence bug)
          let msg =
            data?.message ||
            data?.details?.formErrors?.[0] ||
            data?.error ||
            `Request failed with status ${res.status}`;
        
          // show extra debug info during dev
          if (process.env.NODE_ENV !== "production") {
            msg += data ? `\n\nDebug:\n${JSON.stringify(data, null, 2)}` : "";
          }
        
          setServerError(msg);
          return;
        }
        
        setServerSuccess("Lead submitted successfully ✅");
        setScoring((data as any)?.scoring ?? null);
        reset();
      }),
    [handleSubmit, reset]
  );

  const inputBase =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
    "placeholder:text-gray-400 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-800">Name</label>
          <input className={inputBase} placeholder="Jane Doe" {...register("name")} />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">Email</label>
          <input className={inputBase} placeholder="jane@company.com" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">
            Website <span className="text-gray-500">(optional)</span>
          </label>
          <input
            className={inputBase}
            placeholder="https://company.com"
            {...register("website")}
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {serverError}
          </div>
        )}

        {serverSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {serverSuccess}
          </div>
        )}

        <button
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit Lead"}
        </button>

        {scoring && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="font-semibold text-gray-900">Score: {scoring.score}</div>
            <ul className="mt-2 list-disc pl-5 text-gray-700">
              {(scoring.reasons ?? []).map((r: string) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
