// Gemini extraction schema + prompt for firm intelligence

export const EXTRACTION_TOOL = {
  type: "function",
  function: {
    name: "extract_firm_intelligence",
    description:
      "Extract structured intelligence about an Indian law firm from scraped website markdown and recent news search results. Only include fields explicitly supported by the source text. Use null for unknowns. Do not hallucinate.",
    parameters: {
      type: "object",
      properties: {
        tagline: {
          type: ["string", "null"],
          description: "Short 1-line firm tagline / positioning. Max 160 chars.",
        },
        founded_year: {
          type: ["integer", "null"],
          description: "Year firm was founded (4 digits).",
        },
        total_lawyers: {
          type: ["integer", "null"],
          description:
            "Total number of fee-earners (lawyers + partners). Only set if a clear number appears in the source.",
        },
        partner_count: {
          type: ["integer", "null"],
          description: "Total number of partners. Only set if explicit.",
        },
        general_email: { type: ["string", "null"] },
        careers_email: { type: ["string", "null"] },
        phone_main: { type: ["string", "null"] },
        hq_city: { type: ["string", "null"] },
        offices: {
          type: "array",
          description: "All offices the firm operates from.",
          items: {
            type: "object",
            properties: {
              city: { type: "string" },
              address: { type: ["string", "null"] },
              is_hq: { type: "boolean" },
            },
            required: ["city", "is_hq"],
          },
        },
        practice_areas: {
          type: "array",
          description:
            "Distinct legal practice areas. Clean human-readable names only — no nav labels like 'Privacy Policy' or 'Subscribe'. Mark is_signature=true for the firm's strongest 5-7 practices (those most prominently featured, named-partner-led, or with the most lawyers).",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              partner_count: {
                type: ["integer", "null"],
                description: "Partners in this practice if listed.",
              },
              is_signature: { type: "boolean" },
            },
            required: ["name", "is_signature"],
          },
        },
        rankings: {
          type: "array",
          description:
            "Awards / directory rankings (Chambers, Legal500, IFLR1000, asialaw, RSG). Only include if mentioned with directory + year.",
          items: {
            type: "object",
            properties: {
              source: {
                type: "string",
                enum: [
                  "chambers",
                  "legal500",
                  "iflr1000",
                  "asialaw",
                  "rsg",
                ],
              },
              year: { type: "integer" },
              band_or_tier: { type: "string" },
              practice_area: { type: ["string", "null"] },
            },
            required: ["source", "year", "band_or_tier"],
          },
        },
        news: {
          type: "array",
          description:
            "Recent news mentions from the search results (last 90 days). Each must have a real URL.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              source: {
                type: "string",
                enum: [
                  "bar_bench",
                  "livelaw",
                  "et",
                  "business_standard",
                  "scc",
                  "other",
                ],
              },
              published_at: {
                type: ["string", "null"],
                description: "ISO date if known.",
              },
              mention_type: {
                type: "string",
                enum: ["deal", "award", "lateral", "ranking", "article", "other"],
              },
              excerpt: { type: ["string", "null"] },
            },
            required: ["title", "url", "source", "mention_type"],
          },
        },
      },
      required: ["offices", "practice_areas", "rankings", "news"],
    },
  },
} as const;

export function buildPrompt(args: {
  firmName: string;
  websiteUrl: string;
  websiteMarkdown: string;
  newsResults: Array<{ title: string; url: string; description?: string }>;
}): string {
  const newsBlock = args.newsResults
    .map(
      (n, i) =>
        `[${i + 1}] ${n.title}\n    URL: ${n.url}\n    ${n.description ?? ""}`,
    )
    .join("\n");

  return `You are extracting structured intelligence for the Indian law firm "${args.firmName}" (${args.websiteUrl}).

Below are two information sources. Extract only facts supported by them. Do NOT hallucinate. If a field isn't supported, return null or an empty array.

=== SOURCE 1: FIRM WEBSITE (scraped markdown, may be truncated) ===
${args.websiteMarkdown.slice(0, 60000)}

=== SOURCE 2: RECENT LEGAL NEWS SEARCH RESULTS ===
${newsBlock || "(no results)"}

Now call the extract_firm_intelligence tool. Be strict:
- practice_areas: human-readable names ONLY (e.g. "Mergers & Acquisitions", "Banking & Finance"). Strip nav cruft like "Show ", "Privacy Policy", "Subscribe", "About Us", legal disclaimers, etc.
- Mark is_signature=true for the 5-7 practices most central to the firm.
- Only include rankings when you see explicit directory + year (e.g. "Chambers Asia-Pacific 2025 Band 1").
- News must come from SOURCE 2 with real URLs — don't invent.`;
}
