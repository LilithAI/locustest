import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { tryRecoverFromChunkError } from "../lib/chunkRecovery";

function ClientBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Strip cache-buster ?v= once a fresh build loaded.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("v")) {
        try {
          sessionStorage.setItem("locus_recent_cachebust", "1");
        } catch {
          /* ignore */
        }
        url.searchParams.delete("v");
        const next =
          url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState(window.history.state, "", next);
      }
    } catch {
      /* ignore */
    }

    const onUnhandled = (event: PromiseRejectionEvent) => {
      if (tryRecoverFromChunkError(event.reason)) event.preventDefault();
    };
    const onError = (event: ErrorEvent) => {
      if (tryRecoverFromChunkError(event.error)) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);

    // Standalone PWA session ping
    try {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean })
          .standalone === true;
      if (standalone) {
        void import("../lib/analytics").then((m) =>
          m.track("pwa_session_start"),
        );
      }
    } catch {
      /* noop */
    }

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta name="theme-color" content="#000000" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32.png?v=2"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/favicon.png?v=2"
        />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=2"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Locus" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link
          rel="preload"
          href="/fonts/sora-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
@font-face{font-family:'Sora';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/sora-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Sora';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/sora-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Sora';font-style:normal;font-weight:800;font-display:swap;src:url('/fonts/sora-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Sora';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/sora-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'Sora';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/sora-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'Sora';font-style:normal;font-weight:800;font-display:swap;src:url('/fonts/sora-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var load=function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Mono:wght@400&family=DM+Sans:wght@400;500&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap';document.head.appendChild(l);};if('requestIdleCallback' in window){requestIdleCallback(load,{timeout:4000});}else{window.addEventListener('load',function(){setTimeout(load,1500);});}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','6748646345221689');fbq('track','PageView');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: `{"@context":"https://schema.org","@type":"Organization","name":"Locus","url":"https://locus.legal","description":"India's legal internship platform that connects law students with firms based on merit, not college name.","sameAs":[]}`,
          }}
        />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=6748646345221689&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <div id="root">
          <Outlet />
        </div>
        <ClientBootstrap />
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        title: "Locus — Merit-Based Legal Internships in India",
      },
      {
        name: "description",
        content:
          "India's legal internship platform that connects law students with firms based on merit, not college name. Your merit. Your internship.",
      },
      { name: "author", content: "Locus" },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://locus.legal/" },
      { property: "og:site_name", content: "Locus" },
      {
        property: "og:title",
        content: "Locus — Merit-Based Legal Internships in India",
      },
      {
        property: "og:description",
        content:
          "India's legal internship platform that connects law students with firms based on merit, not college name. Your merit. Your internship.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8567af15-82ee-4014-93f5-9b4242ac8203/id-preview-d6a9d6f1--912baa0f-e70f-4952-850a-3b128d76c697.lovable.app-1772555938707.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Locus — Merit-Based Legal Internships in India",
      },
      {
        name: "twitter:description",
        content:
          "India's legal internship platform that connects law students with firms based on merit, not college name. Your merit. Your internship.",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8567af15-82ee-4014-93f5-9b4242ac8203/id-preview-d6a9d6f1--912baa0f-e70f-4952-850a-3b128d76c697.lovable.app-1772555938707.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://locus.legal/" }],
  }),
  component: RootDocument,
});
