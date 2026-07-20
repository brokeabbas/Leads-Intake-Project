"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";

type Lead = {
  id: string;
  name: string;
  email: string;
  website?: string | null;

  companyDomain?: string | null;
  companyName?: string | null;
  companySize?: string | null;
  industry?: string | null;
  country?: string | null;

  emailStatus?: string | null;
  domainEmailCount?: number | null;

  enrichmentError?: string | null;

  score: number;
  qualified: boolean;

  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardClient() {
  const [onlyQualified, setOnlyQualified] = useState(false);
  const [sort, setSort] = useState<"created_desc" | "score_desc" | "score_asc">("score_desc");

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    if (onlyQualified) sp.set("qualified", "true");
    return `/api/leads?${sp.toString()}`;
  }, [onlyQualified, sort]);

  const { data, error, isLoading, mutate } = useSWR<{ leads: Lead[] }>(url, fetcher);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <label className="inline-flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={onlyQualified}
            onChange={(e) => setOnlyQualified(e.target.checked)}
          />
          Only qualified
        </label>

        <label className="text-sm text-gray-800">
          Sort:&nbsp;
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="score_desc">Score (high → low)</option>
            <option value="score_asc">Score (low → high)</option>
            <option value="created_desc">Newest</option>
          </select>
        </label>

        <button
          className="ml-auto rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          onClick={() => mutate()}
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load leads.
        </div>
      )}

      {!isLoading && data?.leads?.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          No leads yet.
        </div>
      )}

      {data?.leads?.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Enrichment</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.leads.map((l) => (
                <tr key={l.id} className="align-top hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{l.name}</div>
                    <div className="text-gray-600">{l.email}</div>
                    {l.website ? (
                      <a
                        className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                        href={l.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.website}
                      </a>
                    ) : (
                      <div className="text-gray-400">—</div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    <div>Company: <span className="font-medium">{l.companyName ?? "—"}</span></div>
                    <div>Domain: {l.companyDomain ?? "—"}</div>
                    <div>Size: {l.companySize ?? "—"}</div>
                    <div>Industry: {l.industry ?? "—"}</div>
                    <div>Country: {l.country ?? "—"}</div>
                    <div>Email status: {l.emailStatus ?? "—"}</div>
                    <div>Domain email count: {typeof l.domainEmailCount === "number" ? l.domainEmailCount : "—"}</div>

                    {l.enrichmentError ? (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                        {l.enrichmentError}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-lg font-bold text-gray-900">{l.score}</div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        l.qualified
                          ? "bg-green-100 text-green-900 ring-1 ring-green-200"
                          : "bg-gray-100 text-gray-800 ring-1 ring-gray-200",
                      ].join(" ")}
                    >
                      {l.qualified ? "qualified" : "unqualified"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
