import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  usePageMeta({
    title: "Admin Sign In",
    description: "Restricted admin access for Locus.",
    path: "/admin/login",
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const navigate = useNavigate();
  const { ready, hasAnyScope } = useAdminAccess();

  // After sign-in, wait for admin scope to resolve, then route.
  useEffect(() => {
    if (!justSignedIn || !ready) return;
    if (hasAnyScope) {
      toast.success("Welcome, admin");
      navigate("/admin");
    } else {
      supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      setJustSignedIn(false);
    }
  }, [justSignedIn, ready, hasAnyScope, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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
      setJustSignedIn(true);
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!username.trim()) {
      toast.error("Enter your username first");
      return;
    }
    const { data: resolvedEmail } = await supabase.rpc("get_email_by_username", {
      p_username: username.trim(),
    });
    if (!resolvedEmail) {
      toast.error("Username not found");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block mb-4">
            <span className="text-3xl font-extrabold font-heading">
              Loc<span className="text-accent">us</span>
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-accent">
            <Shield size={18} />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">
              Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading mt-2">
            Sign in
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Restricted access. Authorised personnel only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin-username">Username</Label>
            <Input
              id="admin-username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>
          <button
            type="button"
            onClick={handleForgot}
            className="text-xs text-accent hover:underline"
          >
            Forgot password?
          </button>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Not an admin?{" "}
          <Link to="/auth" className="text-accent hover:underline">
            Go to user sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
