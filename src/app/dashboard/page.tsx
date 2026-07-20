import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-600">
        View leads, enrichment data, scores, and qualification status.
      </p>
      <DashboardClient />
    </div>
  );
}
