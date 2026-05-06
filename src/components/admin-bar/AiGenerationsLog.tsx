import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Row = {
  id: string;
  created_at: string;
  generation_type: string;
  outcome: string;
  challenges_created: number;
  duration_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  error_message: string | null;
  source: { title: string } | null;
  requester: { username: string | null } | null;
};

const outcomeVariant = (o: string): "default" | "secondary" | "outline" | "destructive" => {
  if (o === "success") return "default";
  if (o === "validation_fail" || o === "parse_fail") return "secondary";
  if (o === "rate_limit") return "outline";
  return "destructive";
};

export default function AiGenerationsLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bar_ai_generations")
        .select("id, created_at, generation_type, outcome, challenges_created, duration_ms, prompt_tokens, completion_tokens, error_message, source:bar_sources(title), requester:profiles!bar_ai_generations_requested_by_fkey(username)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error(error.message);
      setRows((data as unknown as Row[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Generations Log</h2>
        <span className="text-xs text-muted-foreground">Most recent 200 runs</span>
      </div>
      <Card className="border-2 border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Tokens (p/c)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No generations yet.</TableCell></TableRow>}
            <TooltipProvider>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "PPp")}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.source?.title ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.generation_type}</TableCell>
                  <TableCell className="text-xs">{r.requester?.username ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={outcomeVariant(r.outcome)}>{r.outcome}</Badge>
                      {r.error_message && (
                        <Tooltip>
                          <TooltipTrigger><AlertCircle className="w-4 h-4 text-destructive" /></TooltipTrigger>
                          <TooltipContent className="max-w-sm"><p className="text-xs whitespace-pre-wrap">{r.error_message}</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs">{r.challenges_created}</TableCell>
                  <TableCell className="text-right text-xs">{r.duration_ms != null ? `${r.duration_ms}ms` : "—"}</TableCell>
                  <TableCell className="text-right text-xs">
                    {r.prompt_tokens ?? "—"} / {r.completion_tokens ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TooltipProvider>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
