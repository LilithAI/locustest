import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { WATERMARK_PLAYBOOK_TEMPLATE } from "@/lib/share";

export function EmailBlock({
  subject,
  body,
  to,
}: {
  subject: string;
  body: string;
  to?: string;
}) {
  const [copied, setCopied] = useState(false);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  const handleCopy = async () => {
    const full = `Subject: ${subject}\n\n${body}${WATERMARK_PLAYBOOK_TEMPLATE}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className="my-8 rounded-lg overflow-hidden border"
      style={{
        background: "hsl(39 39% 93%)",
        color: "hsl(36 22% 9%)",
        borderColor: "hsl(39 25% 80%)",
        boxShadow: "0 1px 0 hsl(39 25% 80%), 0 8px 24px -12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Meta strip */}
      <div
        className="flex items-center justify-between px-5 py-2.5 border-b"
        style={{
          borderColor: "hsl(39 25% 82%)",
          background: "hsl(39 39% 90%)",
        }}
      >
        <span
          className="font-sora text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "hsl(36 22% 9% / 0.55)" }}
        >
          Email · Draft · {wordCount} words
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "hsl(36 22% 9% / 0.65)" }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Headers + body */}
      <div className="px-6 py-5 space-y-1.5 text-[0.95rem]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {to && (
          <div className="flex gap-3">
            <span className="w-16 shrink-0" style={{ color: "hsl(36 22% 9% / 0.55)" }}>
              To:
            </span>
            <span>{to}</span>
          </div>
        )}
        <div className="flex gap-3">
          <span className="w-16 shrink-0" style={{ color: "hsl(36 22% 9% / 0.55)" }}>
            Subject:
          </span>
          <span className="font-medium">{subject}</span>
        </div>
        <div
          className="pt-4 mt-3 whitespace-pre-wrap leading-[1.7]"
          style={{ borderTop: "1px solid hsl(39 25% 82%)" }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
