import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useRouterState } from "@tanstack/react-router";
import ProfileMenu from "./ProfileMenuLazy";
import AdminNavLink from "./AdminNavLink";
import { prefetchRoute } from "@/lib/prefetch";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Auth-aware Home target. We deferred-import useAuthSession (same pattern as
  // Index.tsx / AdminNavLink) so anonymous visitors don't pay the supabase
  // chunk cost on first paint. Logged-in users get "Home" silently retargeted
  // to /app once the hook resolves, which prevents the marketing-page flash
  // when they click Home from any other route.
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      import("@/hooks/useAuthSession").then(() => {
        // We can't call the hook here; instead read the cached session
        // directly from the supabase client (already in cache by now).
        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.getSession().then(({ data }) => {
            if (!cancelled && data.session?.user?.id) setIsAuthed(true);
          });
          const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!cancelled) setIsAuthed(!!session?.user?.id);
          });
          // Cleanup is handled by the outer cancelled flag; subscription is
          // long-lived for the navbar's lifetime which matches the app shell.
          if (cancelled) sub.subscription.unsubscribe();
        });
      });
    };
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) ric(load, { timeout: 4000 });
    else window.setTimeout(load, 2500);
    return () => {
      cancelled = true;
    };
  }, []);

  const homeHref = isAuthed ? "/app" : "/";
  const navLinks = [
    { label: "Home", href: homeHref },
    { label: "Directory", href: "/directory" },
    { label: "Opportunities", href: "/opportunities" },
    { label: "Playbook", href: "/playbook" },
    { label: "Resources", href: "/resources" },
    { label: "Tools", href: "/tools" },
    { label: "The Bar", href: "/the-bar", glitch: true },
  ];

  // Prefetch /app eagerly once we know the user is logged in so clicking Home
  // (or any redirect from /) doesn't hit the lazy-load black screen.
  useEffect(() => {
    if (isAuthed) prefetchRoute("/app");
  }, [isAuthed]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href;
  const forceOpaque = pathname.startsWith("/the-bar/challenge");



  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || forceOpaque
          ? "bg-background/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between py-3 px-4 md:px-8">
        <Link to={homeHref as never} className="font-heading tracking-tight leading-none">
          <span className="text-2xl font-extrabold">
            Loc<span className="text-accent">us</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => {
            const prefetch = () => prefetchRoute(l.href);
            return l.glitch ? (
              <Link
                key={l.href}
                to={l.href as never}
                onMouseEnter={prefetch}
                onFocus={prefetch}
                onTouchStart={prefetch}
                className={`relative text-sm font-bold transition-all duration-300 glitch-link ${
                  isActive(l.href) ? "text-accent" : "text-muted-foreground hover:text-accent"
                }`}
                data-text={l.label}
              >
                {l.label}
              </Link>
            ) : (
              <Link
                key={l.href}
                to={l.href as never}
                onMouseEnter={prefetch}
                onFocus={prefetch}
                onTouchStart={prefetch}
                data-tour={l.href === "/opportunities" ? "opportunities-nav" : undefined}
                className={`text-sm font-medium transition-colors duration-300 ${
                  isActive(l.href)
                    ? "text-accent"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <AdminNavLink />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <ProfileMenu />
        </div>

        {/* Mobile theme toggle + profile */}
        <div className="flex md:hidden items-center gap-1">
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ProfileMenu />
        </div>
      </div>

    </nav>
  );
}
