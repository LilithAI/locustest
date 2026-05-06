import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const stream = params.get("stream");
  const [state, setState] = useState<"loading" | "ready" | "done" | "already" | "error">("loading");
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("error"); return; }
    const url = `${FN_URL}?token=${encodeURIComponent(token)}${stream ? `&stream=${encodeURIComponent(stream)}` : ""}`;
    fetch(url, { headers: { apikey: ANON } })
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setEmail(d.email ?? ""); setState("ready"); }
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("error");
      })
      .catch(() => setState("error"));
  }, [token, stream]);

  const confirm = async () => {
    setBusy(true);
    const r = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({ token, stream }),
    });
    const d = await r.json();
    if (d.success) setState("done");
    else if (d.reason === "already_unsubscribed") setState("already");
    else setState("error");
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background border-[3px] border-foreground p-8" style={{ boxShadow: "6px 6px 0 hsl(var(--foreground))" }}>
        <h1 className="font-sora text-3xl font-bold mb-4">
          Loc<span className="bg-accent px-1">us</span>
        </h1>
        {state === "loading" && <p className="font-inter">Verifying link…</p>}
        {state === "error" && <p className="font-inter">This unsubscribe link is invalid or expired.</p>}
        {state === "already" && <p className="font-inter">You're already unsubscribed{stream ? ` from ${stream} emails` : ""}.</p>}
        {state === "ready" && (
          <>
            <p className="font-inter mb-2">Unsubscribe <strong>{email}</strong>{stream ? <> from <strong>{stream}</strong> emails only</> : <> from <strong>all Locus emails</strong></>}?</p>
            <p className="font-inter text-xs text-muted-foreground mb-6">{stream ? "You'll keep getting other Locus emails." : "Auth emails (password resets, etc.) will still come through."}</p>
            <Button onClick={confirm} disabled={busy} className="w-full">{busy ? "Working…" : "Confirm unsubscribe"}</Button>
          </>
        )}
        {state === "done" && <p className="font-inter">Done. You won't receive these emails anymore.</p>}
      </div>
    </div>
  );
}
