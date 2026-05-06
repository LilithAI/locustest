import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  userId: string;
}

export default function OpenToOpportunitiesSection({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("open_to_opportunities")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error("[OpenToOpportunitiesSection] load error:", error);
      }
      setOpen(!!(data as { open_to_opportunities?: boolean } | null)?.open_to_opportunities);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId]);

  const handleToggle = async (next: boolean) => {
    setOpen(next);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ open_to_opportunities: next } as never)
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setOpen(!next);
      toast.error("Couldn't save: " + error.message);
    } else {
      toast.success(next ? "Open to opportunities — visible on your profile" : "Signal turned off");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Opportunities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <Label htmlFor="open-to-opps" className="font-medium cursor-pointer">
              Open to internships
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Shows a small green pill on your public profile so firms know you're looking. You can turn this off anytime.
            </p>
          </div>
          <Switch
            id="open-to-opps"
            checked={open}
            disabled={!loaded || saving}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
