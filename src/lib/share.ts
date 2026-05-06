/**
 * Watermark + share helpers — single source of truth.
 *
 * Rules:
 *  - WATERMARK_DOC: appended to *downloaded files* / template documents.
 *  - WATERMARK_CLIPBOARD: appended to clipboard payloads where the student is
 *    the audience (not a recruiter). One short line.
 *  - WATERMARK_EMAIL_SIG: a one-line "drafted with" footer for emails the
 *    student copies — sits below their signature, easy to delete.
 *  - withRef(): tag any shareable URL with a ref param so we can attribute
 *    inbound traffic from peer-to-peer sharing.
 *
 * NEVER injected into:
 *  - The body of cold emails to recruiters (kept clean).
 *  - AI-generated CV bullet rewrites (goes inside the CV).
 */

export const WATERMARK_DOC =
  "\n\n────────────────────\nGenerated with Locus — Free Legal Tools\nhttps://locus.legal/tools\n";

export const WATERMARK_CLIPBOARD = "\n\n— via Locus · locus.legal";

export const WATERMARK_EMAIL_SIG = "\n\n---\nDrafted with Locus · locus.legal";

export const WATERMARK_PLAYBOOK_TEMPLATE =
  "\n\n— Template via Locus Playbook · locus.legal/playbook";

/** Append a UTM-style ref param to a shareable URL. */
export function withRef(url: string, ref = "share"): string {
  return url + (url.includes("?") ? "&" : "?") + "ref=" + encodeURIComponent(ref);
}

/**
 * Native share with clipboard fallback. Returns "shared" | "copied" | "failed".
 * Use for "Share" buttons across the app.
 */
export async function shareOrCopy(opts: {
  title?: string;
  text: string;
  url?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const navAny = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
  if (navAny?.share) {
    try {
      await navAny.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    } catch {
      // user dismissed — fall through to clipboard
    }
  }
  try {
    const payload = opts.url ? `${opts.text}\n${opts.url}` : opts.text;
    await navigator.clipboard.writeText(payload);
    return "copied";
  } catch {
    return "failed";
  }
}
