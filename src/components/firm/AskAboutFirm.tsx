import { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  slug: string;
  firmName: string;
}

const SUGGESTED = [
  "What do they specialize in?",
  "Are they hiring right now?",
  "Where are their offices?",
  "What makes them different?",
];

type Turn = { role: "user" | "assistant"; content: string };

export default function AskAboutFirm({ slug, firmName }: Props) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setTurns((t) => [...t, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const anon_id = (() => {
        try {
          let id = localStorage.getItem("locus_anon_id");
          if (!id) { id = crypto.randomUUID(); localStorage.setItem("locus_anon_id", id); }
          return id;
        } catch { return null; }
      })();
      const { data, error } = await supabase.functions.invoke("ask-about-firm", {
        body: { slug, question, anon_id },
      });
      if (error) throw error;
      const answer = (data as { answer?: string })?.answer ?? "Not in our records yet.";
      setTurns((t) => [...t, { role: "assistant", content: answer }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: "Couldn't reach the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-10 border-2 border-foreground rounded-2xl p-5 bg-card shadow-[4px_4px_0_0_hsl(var(--accent))]">
      <h2 className="font-heading text-lg font-bold mb-1 inline-flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        Ask about {firmName}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Answers are based only on Locus's structured profile — no fabrication.</p>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="text-xs bg-muted hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-full border border-border/50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`text-sm rounded-xl px-3 py-2 ${t.role === "user" ? "bg-accent/10 text-foreground ml-8" : "bg-muted text-foreground mr-8"}`}
            >
              {t.content}
            </div>
          ))}
          {loading && (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2 mr-8">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-center gap-2 border-2 border-border/60 focus-within:border-accent rounded-xl bg-background pr-1"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this firm…"
          maxLength={500}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40 hover:opacity-90"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </section>
  );
}
