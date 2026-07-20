import LeadForm from "@/components/LeadForm";

export default function Page() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Submit a Lead</h1>
      <p className="text-sm text-slate-600">
        Leads are stored first, then enriched + scored. Enrichment failures won’t block storage.
      </p>
      <LeadForm />
    </div>
  );
}
