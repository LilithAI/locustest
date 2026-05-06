// One-shot admin function: seeds 4 pace-setter benchmark accounts on the Bar leaderboard.
// Re-runnable: skips users that already exist by email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETTERS = [
  { username: "zoyakhan",    display: "Zoya Khan",    pts: 2400, acc: 88, streak: 14, longest: 18, attempts: 142, des: "silk" },
  { username: "aryandsouza", display: "Aryan Dsouza", pts: 1650, acc: 81, streak: 9,  longest: 12, attempts: 98,  des: "senior_associate" },
  { username: "vikramsingh", display: "Vikram Singh", pts: 1100, acc: 76, streak: 6,  longest: 11, attempts: 72,  des: "associate" },
  { username: "meeraiyer",   display: "Meera Iyer",   pts: 640,  acc: 71, streak: 3,  longest: 7,  attempts: 44,  des: "associate" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is admin
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: isAdmin } = await userClient.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const results: Array<{ username: string; status: string; user_id?: string; error?: string }> = [];

  for (const s of SETTERS) {
    const email = `pace-setter-${s.username}@locus.internal`;
    try {
      // Check if profile already exists by username
      const { data: existing } = await admin.from("profiles").select("id, is_pace_setter").eq("username", s.username).maybeSingle();
      if (existing) {
        results.push({ username: s.username, status: "exists", user_id: existing.id });
        continue;
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + "Aa1!",
        email_confirm: true,
        user_metadata: { display_name: s.display, pace_setter: true },
      });
      if (createErr || !created.user) throw createErr ?? new Error("createUser failed");

      const userId = created.user.id;

      // handle_new_user trigger creates a profile row with auto-generated username; overwrite it.
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.display)}&backgroundColor=facc15&textColor=000000`;
      const { error: upErr } = await admin.from("profiles").update({
        username: s.username,
        display_name: s.display,
        avatar_url: avatar,
        is_pace_setter: true,
      }).eq("id", userId);
      if (upErr) throw upErr;

      // Stats: handle_new_user_bar_stats trigger may have inserted a zero row; upsert to overwrite.
      const correct = Math.round((s.attempts * s.acc) / 100);
      const lastAttempt = new Date(Date.now() - (1 + Math.random() * 3) * 86400_000).toISOString();
      const { error: statsErr } = await admin.from("bar_user_stats").upsert({
        user_id: userId,
        total_points: s.pts,
        total_attempts: s.attempts,
        correct_attempts: correct,
        accuracy_pct: s.acc,
        current_streak: s.streak,
        longest_streak: s.longest,
        designation: s.des,
        last_attempt_at: lastAttempt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (statsErr) throw statsErr;

      results.push({ username: s.username, status: "created", user_id: userId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ username: s.username, status: "error", error: msg });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
