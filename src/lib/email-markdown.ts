// Tiny safe markdown→HTML — mirrors supabase/functions/send-broadcast/index.ts
export function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = md.trim().split(/\n{2,}/);
  return blocks
    .map((b) => {
      let html = esc(b);
      html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" style="color:#0A0A0A;text-decoration:underline">$1</a>'
      );
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      html = html.replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px">${html}</p>`;
    })
    .join("");
}
