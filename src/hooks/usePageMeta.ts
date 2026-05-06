import { useEffect } from "react";

const BASE_URL = "https://locus.legal";
const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8567af15-82ee-4014-93f5-9b4242ac8203/id-preview-d6a9d6f1--912baa0f-e70f-4952-850a-3b128d76c697.lovable.app-1772555938707.png";

interface PageMeta {
  title: string;
  description: string;
  path?: string; // e.g. "/directory"
  ogImage?: string;
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

export function usePageMeta({ title, description, path = "", ogImage }: PageMeta) {
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
  }, [title, description, path, ogImage]);
}
