import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BarPrivacySectionProps {
  userId: string;
}

export default function BarPrivacySection({ userId }: BarPrivacySectionProps) {
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("bar_leaderboard_opt_out")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error("[BarPrivacySection] load error:", error);
      }
      const optOut = (data as { bar_leaderboard_opt_out?: boolean } | null)?.bar_leaderboard_opt_out ?? false;
      setShowOnLeaderboard(!optOut);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bar_leaderboard_opt_out: !showOnLeaderboard } as never)
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save: " + error.message);
    } else {
      toast.success("Privacy preference saved");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">The Bar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="show-leaderboard"
            checked={showOnLeaderboard}
            onCheckedChange={(v) => setShowOnLeaderboard(v === true)}
            disabled={!loaded}
          />
          <div className="space-y-1">
            <Label htmlFor="show-leaderboard" className="font-medium cursor-pointer">
              Show me on Bar leaderboards
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your designation still shows on your profile either way. Uncheck this to hide your numeric rank from public leaderboards.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} size="sm" disabled={saving || !loaded}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
