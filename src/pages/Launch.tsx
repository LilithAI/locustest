import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LAUNCH_DATE } from "@/components/LaunchGate";

function getRemaining() {
  const ms = Math.max(0, LAUNCH_DATE.getTime() - Date.now());
  const sec = Math.floor(ms / 1000);
  return {
    d: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
    expired: ms === 0,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

export default function Launch() {
  const [t, setT] = useState(getRemaining);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setT(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  // Page meta
  useEffect(() => {
    const prev = document.title;
    document.title = "Locus is going public — 27 May 2026";
    return () => {
      document.title = prev;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email");
      setStatus("err");
      return;
    }
    setStatus("submitting");
    setError(null);
    const { error: insertError } = await supabase
      .from("launch_notify")
      .insert({ email: value, source: "launch_page" });

    // Treat unique-constraint violation as success (already subscribed).
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      setStatus("err");
      setError("Couldn't save that. Try again in a sec.");
      return;
    }
    setStatus("ok");
    setEmail("");
  };

  const countdown = useMemo(
    () => [
      { label: "Days", value: t.d },
      { label: "Hours", value: t.h },
      { label: "Minutes", value: t.m },
      { label: "Seconds", value: t.s },
    ],
    [t]
  );

  return (
    <main className="min-h-screen bg-black text-white font-inter">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 border-2 border-accent bg-accent px-2 py-1 font-sora text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-[4px_4px_0_0_#fff]">
          Launch · 27 May 2026
        </div>

        {/* Headline */}
        <h1 className="mt-6 font-sora text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Locus is going public on <span className="text-accent">27 May 2026.</span>
        </h1>

        {/* Countdown */}
        <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-4">
          {countdown.map((c) => (
            <div
              key={c.label}
              className="border-2 border-white bg-black px-2 py-3 text-center shadow-[4px_4px_0_0_hsl(var(--accent))] sm:py-5"
            >
              <div className="font-sora text-3xl font-black tabular-nums sm:text-5xl">
                {pad(c.value)}
              </div>
              <div className="mt-1 font-sora text-[10px] font-bold uppercase tracking-widest text-white/60 sm:text-xs">
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="mt-10 space-y-5 text-base leading-relaxed text-white/85 sm:text-lg">
          <p>
            You were one of the first people to ever use it. Before the firms, before the
            leaderboards, before any of this had a name people knew. That mattered. Still does.
          </p>
          <p>
            Here's what's happening: between now and the 27th, we're migrating to public
            infrastructure. Every beta account will be wiped clean in the process — not
            because we're starting over, but because the playing field needs to be level when
            the rest of the country walks in.
          </p>
          <p className="font-sora text-xl font-bold text-white sm:text-2xl">
            And they're walking in on the 27th.
          </p>
          <p>
            When Locus reopens, it won't be a small beta circle anymore. It'll be every law
            student in India on the same Merit Profile, the same Bar leaderboards, the same
            shot. No NLU tag protecting anyone. No surnames doing the work. Just what you can
            actually do, visible to every firm watching.
          </p>
          <div className="border-l-4 border-accent bg-white/5 p-4">
            <p className="font-sora text-sm font-bold uppercase tracking-wider text-accent">
              Heads-up
            </p>
            <p className="mt-2 text-white/85">
              During the migration window, you might see locus.legal look broken, load weirdly,
              or go down for short stretches. That's expected — it's just the move happening
              behind the scenes. We'd suggest not using Locus in the meantime. Everything will
              be live and clean by the 27th.
            </p>
          </div>
          <p>
            You were early once. You get to be early again — first ones back through the door
            on launch day.
          </p>
        </div>

        {/* Email capture */}
        <form
          onSubmit={onSubmit}
          className="mt-10 border-2 border-white bg-black p-5 shadow-[6px_6px_0_0_hsl(var(--accent))]"
        >
          <label
            htmlFor="notify-email"
            className="font-sora text-sm font-black uppercase tracking-wider"
          >
            Get the re-signup link first
          </label>
          <p className="mt-1 text-sm text-white/60">
            Drop your email. We'll send the re-signup link the moment Locus reopens.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              id="notify-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@law.edu"
              className="flex-1 border-2 border-white bg-black px-3 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
              disabled={status === "submitting" || status === "ok"}
            />
            <button
              type="submit"
              disabled={status === "submitting" || status === "ok"}
              className="border-2 border-accent bg-accent px-5 py-3 font-sora text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#fff] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Saving…" : status === "ok" ? "You're in ✓" : "Notify me"}
            </button>
          </div>
          {status === "ok" && (
            <p className="mt-3 text-sm text-accent">
              Locked in. You'll hear from us on 27 May.
            </p>
          )}
          {status === "err" && error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-sm text-white/50 sm:flex-row sm:items-center">
          <p className="font-mono">Re-signup link drops 27 May. Stay sharp.</p>
          <Link to="/auth" className="font-mono underline-offset-4 hover:text-white hover:underline">
            Beta user? Sign in →
          </Link>
        </div>
      </div>
    </main>
  );
}
