// "Reason It Through" — post-answer tutor chat panel.
// Easter egg: the short form "Rit" is dedicated to someone special. ✦

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { ChevronDown, Sparkles, Send, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RitMessage } from "./RitMessage";
import { RitStarterChip } from "./RitStarterChip";
import { RitGlitchTitle } from "./RitGlitchTitle";
import { cn } from "@/lib/utils";

const MAX_MESSAGES = 20;
const STARTERS = [
  "Why isn't my answer correct?",
  "Cite the leading case",
  "Give me a similar hypothetical",
];

interface RitMsg {
  role: "user" | "assistant";
  content: string;
  id?: string;
  created_at?: string;
}

interface Props {
  attemptId: string;
  challenge: {
    title?: string | null;
    question_type?: string | null;
    correct_answer_summary?: string | null;
  };
  /**
   * Optional pre-computed greeting. If absent, falls back to a generic line.
   */
  greeting?: string;
  /** Default open state (closed by default) */
  defaultOpen?: boolean;
  /** Demo mode: skip DB/edge function, use canned replies. Used on the preview page. */
  demoMode?: boolean;
  /** Canned replies keyed by message text (case-insensitive exact match). */
  demoReplies?: Record<string, string>;
}

const DEMO_FALLBACK =
  "In the live version I'd reason this through with you using your actual question and answer. This is a static demo — try one of the chips above to see Rit in action.";

export function RitChatPanel({ attemptId, challenge, greeting, defaultOpen = false, demoMode = false, demoReplies }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<RitMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hiddenCleared, setHiddenCleared] = useState(false);
  const [hideBeforeIndex, setHideBeforeIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const computedGreeting = useMemo(() => {
    if (greeting && greeting.trim().length > 0) return greeting;
    const summary = challenge.correct_answer_summary?.trim();
    if (summary) {
      return `Hi — I'm here to help you reason this through. ${summary}. What part would you like to dig into?`;
    }
    return "Hi — I'm here to help you reason this through. What part of the question would you like to explore?";
  }, [greeting, challenge.correct_answer_summary]);

  // Load history on first expand (skipped in demo mode)
  useEffect(() => {
    if (!open || loaded) return;
    if (demoMode) {
      setLoaded(true);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("bar_rit_messages" as any)
        .select("id, role, content, created_at")
        .eq("attempt_id", attemptId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("rit history load error", error);
      }
      setMessages((data ?? []) as unknown as RitMsg[]);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [open, loaded, attemptId, demoMode]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  const visibleMessages = hiddenCleared ? messages.slice(hideBeforeIndex) : messages;
  const messageCount = messages.length;
  const capReached = messageCount >= MAX_MESSAGES;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || capReached) return;
    if (trimmed.length > 1500) {
      toast.error("Please keep messages under 1500 characters.");
      return;
    }

    setSending(true);
    setInput("");
    // Keep hidden state — newly added messages will still be visible via slice(hideBeforeIndex)
    // optimistic user bubble
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    if (demoMode) {
      // Simulated typing delay + canned reply lookup
      const lookup = demoReplies ?? {};
      const key = Object.keys(lookup).find(
        (k) => k.toLowerCase() === trimmed.toLowerCase()
      );
      const reply = key ? lookup[key] : DEMO_FALLBACK;
      await new Promise((r) => setTimeout(r, 1200));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setSending(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("rit-chat", {
        body: { attempt_id: attemptId, message: trimmed },
      });
      if (error) {
        const ctx = (error as any).context;
        let parsed: any = null;
        try { if (ctx?.json) parsed = await ctx.json(); } catch { /* ignore */ }
        const friendly = parsed?.message
          ?? (parsed?.error === "rate_limited"
            ? "Rit is taking a breather — try again in a moment."
            : parsed?.error === "credits_exhausted"
            ? "Rit is out of credits. Please add funds in Settings."
            : "Rit couldn't reply. Please try again.");
        toast.error(friendly);
        // rollback optimistic message
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      const reply = (data as any)?.reply as string | undefined;
      if (!reply) {
        toast.error("Rit couldn't reply. Please try again.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("rit-chat invoke fail", e);
      toast.error("Network error. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <Card className="border-2 border-border overflow-hidden group/rit">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "rit-hover-trigger relative w-full flex items-center gap-3 p-4 text-left transition-colors",
          "hover:bg-muted/30",
        )}
      >
        {/* Animated bottom border sweep — only when closed */}
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px animate-rit-border-sweep"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        )}

        {/* Left icon block — neobrutalist square */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-md border-2 border-border bg-accent/15 flex items-center justify-center",
            "shadow-[2px_2px_0_0_hsl(var(--border))]",
          )}
        >
          <Sparkles size={18} className="text-accent animate-rit-icon-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RitGlitchTitle text="Reason It Through" className="text-sm" />

            {/* Animated Rit pill */}
            <span
              title="Reason It Through"
              className={cn(
                "relative inline-flex items-center gap-1 overflow-hidden",
                "h-5 px-2 rounded-full border-2 border-accent",
                "bg-accent/10 text-accent text-[10px] font-extrabold tracking-wide font-heading uppercase",
                "shadow-[1.5px_1.5px_0_0_hsl(var(--accent))]",
                "transition-all duration-150",
                "group-hover/rit:scale-105 group-hover/rit:shadow-[1px_1px_0_0_hsl(var(--accent))]",
              )}
            >
              <Sparkles size={8} className="text-accent" />
              <span className="relative z-10">Rit</span>
              {/* Shimmer sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 animate-rit-pill-shimmer"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.55) 50%, transparent 100%)",
                }}
              />
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Debate the answer
            <span className="text-accent mx-1.5">·</span>
            ask follow-ups
            <span className="text-accent mx-1.5">·</span>
            dig deeper
          </div>
        </div>

        <ChevronDown
          size={18}
          className={cn(
            "text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t-2 border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border text-[11px] text-muted-foreground">
            <span>{messageCount} / {MAX_MESSAGES} messages</span>
            {visibleMessages.length > 0 && (
              <button
                type="button"
                onClick={() => { setHideBeforeIndex(messages.length); setHiddenCleared(true); }}
                title="Hides messages locally only — your conversation is still saved and counts toward the limit."
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <EyeOff size={11} /> Hide history
              </button>
            )}
          </div>

          <div ref={scrollRef} className="max-h-[420px] overflow-y-auto p-4 space-y-3">
            {/* Greeting (always shown, not counted toward cap) */}
            <div className="animate-fade-in">
              <RitMessage role="assistant" content={computedGreeting} />
            </div>

            {visibleMessages.map((m, i) => (
              <RitMessage key={m.id ?? i} role={m.role} content={m.content} />
            ))}

            {visibleMessages.length === 0 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map((s, i) => (
                  <div
                    key={s}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <RitStarterChip label={s} onClick={() => send(s)} disabled={sending} />
                  </div>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <span className="inline-flex items-center gap-1" aria-label="Rit is thinking">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-rit-dot-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-rit-dot-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-rit-dot-bounce" style={{ animationDelay: "240ms" }} />
                </span>
                Rit is thinking…
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 space-y-2">
            {capReached ? (
              <div className="text-center text-xs text-muted-foreground py-2">
                You've reached the conversation limit for this challenge. Try a fresh challenge to keep reasoning.
              </div>
            ) : (
              <>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask Rit anything about this question…"
                  rows={2}
                  maxLength={1500}
                  disabled={sending}
                  className={cn("resize-none text-sm")}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Enter to send · Shift+Enter for newline
                  </span>
                  <Button
                    size="sm"
                    onClick={() => send(input)}
                    disabled={sending || input.trim().length === 0}
                    className={cn(
                      "gap-1.5 transition-shadow",
                      "focus-visible:shadow-[0_0_0_3px_hsl(var(--accent)/0.45)]",
                    )}
                  >
                    <Send size={12} />
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
