import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";

export default function Auth() {
  usePageMeta({ title: "Sign In", description: "Sign in or create your Locus account to access merit-based legal internships.", path: "/auth" });
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next") ?? searchParams.get("redirect");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;
  const postLoginPath = safeNext ?? "/app";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
          "get_email_by_username",
          { p_username: username.trim() }
        );
        if (rpcError) throw rpcError;
        if (!resolvedEmail) throw new Error("Username not found");

        const { error } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });
        if (error) throw error;
        void track("signup_completed", { method: "email", mode: "login" });
        toast.success("Welcome back!");
        navigate(postLoginPath);
      } else {
        if (!username.trim() || /\s/.test(username)) {
          throw new Error("Username is required and cannot contain spaces");
        }
        void track("signup_started", { method: "email" });
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: username.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        void track("signup_completed", { method: "email", mode: "signup" });
        toast.success("Check your email to confirm your account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username.trim()) {
      toast.error("Enter your username to reset your password");
      return;
    }
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
      "get_email_by_username",
      { p_username: username.trim() }
    );
    if (rpcError || !resolvedEmail) {
      toast.error("Username not found");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block mb-6">
            <span className="text-3xl font-extrabold font-heading">
              Loc<span className="text-accent">us</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {isLogin ? "Welcome back" : "Join Locus"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isLogin ? "Sign in to your account." : "Create an account to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLogin ? "Your username" : "Choose a username (no spaces)"}
              className="mt-1"
            />
          </div>

          {!isLogin && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>

          {isLogin && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-accent hover:underline"
            >
              Forgot password?
            </button>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-accent hover:underline font-medium"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <Link
          to="/tools/cv-analyser"
          className="group flex items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 transition-colors hover:border-accent/60 hover:bg-accent/10"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-accent/40 bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent">
              <span className="h-1 w-1 rounded-[1px] bg-accent" />
              Locus+
            </span>
            <span className="truncate text-xs text-foreground/80">
              Get your CV scored — no signup needed
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent opacity-70 group-hover:opacity-100">
            Try →
          </span>
        </Link>
      </div>
    </div>
  );
}
