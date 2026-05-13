import { useEffect } from "react";

const BASE_URL = "https://locus.legal";
const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8567af15-82ee-4014-93f5-9b4242ac8203/id-preview-d6a9d6f1--912baa0f-e70f-4952-850a-3b128d76c697.lovable.app-1772555938707.png";

interface PageMeta {
  title: string;
  description: string;
  path?: string; // e.g. "/directory"
  ogImage?: string;
  /**
   * One or more JSON-LD blocks to attach to this page (e.g. Article,
   * BreadcrumbList, Organization). Replaces previous page-scoped blocks
   * on every change. Sitewide blocks declared in index.html are untouched.
   */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMetaTag(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

const PAGE_LD_FLAG = "data-page-jsonld";

function setPageJsonLd(blocks: Record<string, unknown>[] | undefined) {
  // Remove any previous page-scoped blocks (sitewide blocks in index.html
  // don't carry the data-page-jsonld attribute, so they're left alone).
  document.querySelectorAll(`script[${PAGE_LD_FLAG}]`).forEach((n) => n.remove());
  if (!blocks?.length) return;
  for (const block of blocks) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute(PAGE_LD_FLAG, "");
    s.text = JSON.stringify(block);
    document.head.appendChild(s);
  }
}

export function usePageMeta({ title, description, path = "", ogImage, jsonLd }: PageMeta) {
  // Stable string key so changing the schema object identity doesn't re-fire
  // the effect on every render.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const fullTitle = title.includes("Locus") ? title : `${title} — Locus`;
    const fullUrl = `${BASE_URL}${path}`;
    const image = ogImage || DEFAULT_OG_IMAGE;

    document.title = fullTitle;

    // Standard meta
    setMetaTag("name", "description", description);

    // Canonical
    setCanonical(fullUrl);

    // Open Graph
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", fullUrl);
    setMetaTag("property", "og:image", image);

    // Twitter
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", image);

    // Page-scoped structured data
    const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : undefined;
    setPageJsonLd(blocks);

    return () => {
      // Clean up page-scoped JSON-LD on unmount so SPA navigation doesn't
      // leave stale Article/Breadcrumb blocks attached to the next page.
      setPageJsonLd(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, ogImage, jsonLdKey]);
}
