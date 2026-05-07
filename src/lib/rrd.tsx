/**
 * Compatibility shim: drop-in replacement for `react-router-dom`'s most-used
 * exports, backed by `@tanstack/react-router`.
 *
 * The point of this shim is to let us migrate to TanStack Router file-based
 * routing without rewriting 76 call sites. Behavior is preserved for the
 * react-router APIs we actually use.
 *
 * Only the surface our app uses is implemented: Link, NavLink, Navigate,
 * Outlet, useLocation, useNavigate, useParams, useSearchParams.
 */
import { forwardRef, useCallback, useMemo } from "react";
import type { CSSProperties, ReactNode, AnchorHTMLAttributes } from "react";
import {
  Link as TLink,
  Navigate as TNavigate,
  Outlet as TOutlet,
  useLocation as tUseLocation,
  useNavigate as tUseNavigate,
  useParams as tUseParams,
  useRouterState,
} from "@tanstack/react-router";

/* -------------------- Outlet & Navigate -------------------- */
export const Outlet = TOutlet;

export type NavigateProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
};
export function Navigate({ to, replace }: NavigateProps) {
  // TanStack's Navigate signature is similar; preserve `replace`.
  return <TNavigate to={to as never} replace={replace} />;
}

/* -------------------- Link -------------------- */
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  replace?: boolean;
  state?: unknown;
  reloadDocument?: boolean;
  preventScrollReset?: boolean;
  end?: boolean;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state: _state, reloadDocument: _r, preventScrollReset: _p, end: _e, children, ...rest },
  ref,
) {
  if (typeof to === "string" && /^(https?:|mailto:|tel:|#)/.test(to)) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  }
  // TanStack supports passing a plain `to` string for static paths. For
  // dynamic params (e.g. "/playbook/abc") TanStack also accepts a string.
  // Type-safe param routing is opt-in via `params=`; we don't use it here.
  return (
    <TLink ref={ref} to={to as never} replace={replace} {...rest}>
      {children as never}
    </TLink>
  );
});

/* -------------------- NavLink -------------------- */
type NavLinkRenderProps = { isActive: boolean; isPending: boolean; isTransitioning: boolean };
type NavLinkProps = Omit<LinkProps, "className" | "style" | "children"> & {
  className?: string | ((p: NavLinkRenderProps) => string);
  style?: CSSProperties | ((p: NavLinkRenderProps) => CSSProperties | undefined);
  children?: ReactNode | ((p: NavLinkRenderProps) => ReactNode);
  end?: boolean;
};

export type { NavLinkProps };

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const target = typeof to === "string" ? to : "/";
  const isActive = end ? pathname === target : pathname === target || pathname.startsWith(target + "/");
  const renderProps: NavLinkRenderProps = { isActive, isPending: false, isTransitioning: false };

  const resolvedClassName = typeof className === "function" ? className(renderProps) : className;
  const resolvedStyle = typeof style === "function" ? style(renderProps) : style;
  const resolvedChildren = typeof children === "function" ? children(renderProps) : children;

  return (
    <Link
      ref={ref}
      to={target}
      className={resolvedClassName}
      style={resolvedStyle}
      data-active={isActive ? "true" : undefined}
      aria-current={isActive ? "page" : undefined}
      {...rest}
    >
      {resolvedChildren}
    </Link>
  );
});

/* -------------------- useLocation -------------------- */
export function useLocation() {
  const loc = tUseLocation();
  // react-router shape: { pathname, search, hash, state, key }
  // TanStack already gives pathname, search (object), hash, state.
  // Some call sites read `location.search` as a query string. Reconstruct it.
  const searchString = useMemo(() => {
    const s = (loc as { searchStr?: string }).searchStr;
    if (typeof s === "string") return s.startsWith("?") || s === "" ? s : `?${s}`;
    const obj = loc.search as Record<string, unknown> | undefined;
    if (!obj || Object.keys(obj).length === 0) return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      params.set(k, String(v));
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  }, [loc]);

  return {
    pathname: loc.pathname,
    search: searchString,
    hash: loc.hash || "",
    state: (loc.state ?? null) as unknown,
    key: (loc as { href?: string }).href || loc.pathname,
  };
}

/* -------------------- useNavigate -------------------- */
type NavigateOptions = { replace?: boolean; state?: unknown };
type NavigateFn = {
  (to: string, opts?: NavigateOptions): void;
  (delta: number): void;
};

export function useNavigate(): NavigateFn {
  const tnav = tUseNavigate();
  return useCallback<NavigateFn>(((to: string | number, opts?: NavigateOptions) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    if (/^(https?:)/.test(to)) {
      if (opts?.replace) window.location.replace(to);
      else window.location.assign(to);
      return;
    }
    void tnav({ to: to as never, replace: opts?.replace });
  }) as NavigateFn, [tnav]);
}

/* -------------------- useParams -------------------- */
export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  const params = tUseParams({ strict: false }) as Record<string, string | undefined>;
  return params as T;
}

/* -------------------- useSearchParams -------------------- */
type SetURLSearchParams = (
  next:
    | URLSearchParams
    | string
    | Record<string, string | string[]>
    | ((prev: URLSearchParams) => URLSearchParams),
  opts?: { replace?: boolean },
) => void;

export function useSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const loc = tUseLocation();
  const tnav = tUseNavigate();

  const params = useMemo(() => {
    const obj = (loc.search as Record<string, unknown>) || {};
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        for (const item of v) usp.append(k, String(item));
      } else {
        usp.set(k, String(v));
      }
    }
    return usp;
  }, [loc.search]);

  const setParams = useCallback<SetURLSearchParams>(
    (next, opts) => {
      let usp: URLSearchParams;
      if (typeof next === "function") {
        usp = next(new URLSearchParams(params));
      } else if (next instanceof URLSearchParams) {
        usp = next;
      } else if (typeof next === "string") {
        usp = new URLSearchParams(next);
      } else {
        usp = new URLSearchParams();
        for (const [k, v] of Object.entries(next)) {
          if (Array.isArray(v)) for (const item of v) usp.append(k, item);
          else usp.set(k, v);
        }
      }
      const obj: Record<string, string> = {};
      usp.forEach((v, k) => {
        obj[k] = v;
      });
      void tnav({ to: loc.pathname as never, search: obj as never, replace: opts?.replace });
    },
    [params, tnav, loc.pathname],
  );

  return [params, setParams];
}

/* -------------------- BrowserRouter / Routes / Route stubs -------------------- */
// These are referenced only inside App.tsx which we replace separately.
// Re-export as no-op fragments so any stray import doesn't crash the build.
export function BrowserRouter({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function Routes({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function Route(_: unknown): null {
  return null;
}
