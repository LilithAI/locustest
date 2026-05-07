import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getFirmIntelligenceBySlug, type FirmIntelligenceFull } from "@/lib/firmIntelligence";
import { RefreshIntelligenceButton } from "@/components/firm/RefreshIntelligenceButton";

export default function FirmProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [firm, setFirm] = useState<FirmIntelligenceFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getFirmIntelligenceBySlug(slug).then((f) => {
      setFirm(f);
      setLoading(false);
    });
  }, [slug]);

  usePageMeta({
    title: firm ? `${firm.firm_name} — Firm Intelligence | Locus` : "Firm Intelligence | Locus",
    description: firm ? `Firm intelligence profile for ${firm.firm_name}.` : "Firm intelligence profile.",
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-12 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-20 text-center">
        <Building2 className="mx-auto mb-4 opacity-40" size={48} />
        <h1 className="font-heading text-2xl mb-2">Firm not found</h1>
        <p className="text-muted-foreground mb-6">We don't have an intelligence profile for this firm yet.</p>
        <Link to="/directory" className="text-accent hover:underline">← Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">
      <Link to="/directory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={14} /> Back to Directory
      </Link>

      <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4 leading-tight">{firm.firm_name}</h1>
      <p className="text-muted-foreground">Firm Intelligence page — UI coming next.</p>
    </div>
  );
}
