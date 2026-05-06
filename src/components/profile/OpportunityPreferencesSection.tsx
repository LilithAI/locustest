import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, Check } from "lucide-react";
import { TIER_OPTIONS, TIER_LABELS, PRACTICE_AREA_SUGGESTIONS, type VacancyTier } from "@/lib/vacancies";
import { LOCATION_OPTIONS } from "@/lib/opportunity-ranker";

interface Props {
  userId: string;
}

export default function OpportunityPreferencesSection({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<VacancyTier[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("target_tiers, target_locations, target_practice_areas")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setTiers(((data.target_tiers as string[] | null) ?? []) as VacancyTier[]);
        setLocations((data.target_locations as string[] | null) ?? []);
        setAreas((data.target_practice_areas as string[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const toggle = <T extends string>(list: T[], setList: (v: T[]) => void, value: T) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        target_tiers: tiers,
        target_locations: locations,
        target_practice_areas: areas,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Preferences saved — your Recommended feed just got sharper.");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-heading">Opportunity preferences</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="preferences" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Opportunity preferences
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Tell us what to surface first. Powers your <span className="font-bold">Recommended for you</span> rail on Opportunities.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-bold">Target tiers</Label>
          <div className="flex flex-wrap gap-2">
            {TIER_OPTIONS.filter((t) => t !== "other").map((t) => {
              const active = tiers.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(tiers, setTiers, t)}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-bold uppercase tracking-wider transition-all",
                    active
                      ? "border-foreground bg-accent text-accent-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "border-foreground/30 bg-background text-muted-foreground hover:border-foreground/60",
                  )}
                >
                  {active && <Check size={12} />}
                  {TIER_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-bold">Target locations</Label>
          <div className="flex flex-wrap gap-2">
            {LOCATION_OPTIONS.map((loc) => {
              const active = locations.includes(loc);
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggle(locations, setLocations, loc)}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-bold uppercase tracking-wider transition-all",
                    active
                      ? "border-foreground bg-accent text-accent-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "border-foreground/30 bg-background text-muted-foreground hover:border-foreground/60",
                  )}
                >
                  {active && <Check size={12} />}
                  {loc}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-bold">Practice areas</Label>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_AREA_SUGGESTIONS.map((area) => {
              const active = areas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggle(areas, setAreas, area)}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-bold uppercase tracking-wider transition-all",
                    active
                      ? "border-foreground bg-accent text-accent-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "border-foreground/30 bg-background text-muted-foreground hover:border-foreground/60",
                  )}
                >
                  {active && <Check size={12} />}
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</> : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
