import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Building2, MapPin, Star, Phone, Mail, GitCompareArrows, Trophy, ArrowRight, Rocket, Globe, Users, Scale, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { loadIntelligenceIndex, getIntelligenceForName, type FirmIntelligenceSummary } from "@/lib/firmIntelligence";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { shareOrCopy, withRef } from "@/lib/share";
import { ShareIconButton } from "@/components/ShareIconButton";
import firms from "@/data/firms.json";
import startupsData from "@/data/startups.json";
import FirmDrawer from "@/components/FirmDrawer";
import CompareBar from "@/components/CompareBar";
import DirectoryMap from "@/components/DirectoryMap";
import StartupDrawer, { type Startup } from "@/components/StartupDrawer";

import FilterBar from "@/components/directory/FilterBar";

const startups = startupsData as Startup[];

const allCities = [...new Set(firms.map((f) => f.city).filter(Boolean))].sort();
const allAreas = [...new Set(firms.map((f) => f.area).filter(Boolean))].sort();
const allTiers = [...new Set(firms.map((f) => f.tier).filter(Boolean))].sort();

// Startup filter facets (precomputed once at module load for snappy filtering)
const startupCities = [...new Set(startups.map((s) => s.city).filter(Boolean) as string[])].sort();
const startupSectors = [...new Set(startups.map((s) => s.sector).filter(Boolean) as string[])].sort();
const startupStages = [...new Set(startups.map((s) => s.stage).filter(Boolean) as string[])].sort();
const startupSizes = [
  "11-50", "51-100", "101-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+",
].filter((sz) => startups.some((s) => s.employees === sz));

const PAGE_SIZE = 30;

type FirmType = "Law Firm" | "Chamber" | "Individual Advocate";
type SortOption = "relevance" | "rating-desc" | "name-asc" | "name-desc" | "tier";
type Mode = "firms" | "startups";
type Channel = "email" | "phone";

const mailNowCount = firms.filter((f) => !!f.email).length;
const coldCallCount = firms.length - mailNowCount;


const typeFilters: { label: string; value: FirmType | "" }[] = [
  { label: "All", value: "" },
  { label: "Law Firms", value: "Law Firm" },
  { label: "Chambers", value: "Chamber" },
  { label: "Individual Advocates", value: "Individual Advocate" },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Relevance", value: "relevance" },
  { label: "Rating (High → Low)", value: "rating-desc" },
  { label: "Name (A → Z)", value: "name-asc" },
  { label: "Name (Z → A)", value: "name-desc" },
  { label: "Tier", value: "tier" },
];

function getType(firm: (typeof firms)[0]): FirmType {
  const name = firm.name.toLowerCase();
  const tierLower = (firm.tier || "").toLowerCase();
  if (name.includes("chamber") || tierLower.includes("individual chamber")) return "Chamber";
  if (name.includes("advocate") || name.includes("adv.") || name.includes("adv ")) return "Individual Advocate";
  return "Law Firm";
}

export default function Directory() {
  usePageMeta({ title: "Firm Directory", description: "Browse 3,600+ Indian law firms — 880+ direct emails and 51 independently verified. Filter by Mail Now or Cold Call.", path: "/directory" });

  // Mode (URL-synced)
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "startups" ? "startups" : "firms";
  const [mode, setMode] = useState<Mode>(initialMode);
  const initialChannel: Channel = searchParams.get("channel") === "phone" ? "phone" : "email";
  const [channel, setChannel] = useState<Channel>(initialChannel);
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (mode === "startups") next.set("mode", "startups");
    else next.delete("mode");
    if (mode === "firms" && channel === "phone") next.set("channel", "phone");
    else next.delete("channel");
    next.delete("verified");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, channel]);

  const initialQ = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [area, setArea] = useState(searchParams.get("area") ?? "");
  const [tier, setTier] = useState(searchParams.get("tier") ?? "");
  const [type, setType] = useState<FirmType | "">(
    (searchParams.get("type") as FirmType) ?? "",
  );
  const [sort, setSort] = useState<SortOption>("relevance");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "map">("grid");

  // Startup-specific filters
  const [sCity, setSCity] = useState(searchParams.get("sCity") ?? "");
  const [sSector, setSSector] = useState(searchParams.get("sSector") ?? "");
  const [sStage, setSStage] = useState(searchParams.get("sStage") ?? "");
  const [sSize, setSSize] = useState(searchParams.get("sSize") ?? "");
  const [sLegal, setSLegal] = useState<"" | "yes" | "no">(
    (searchParams.get("sLegal") as "" | "yes" | "no") ?? "",
  );

  // Intelligence filters
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "1");
  const [hiringOnly, setHiringOnly] = useState(searchParams.get("hiring") === "1");
  const [intelIndex, setIntelIndex] = useState<Map<string, FirmIntelligenceSummary> | null>(null);
  useEffect(() => { loadIntelligenceIndex().then(setIntelIndex); }, []);

  // Reset page on mode switch
  useEffect(() => { setPage(1); setView("grid"); }, [mode]);

  // Drawer
  const [drawerFirm, setDrawerFirm] = useState<(typeof firms)[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStartup, setDrawerStartup] = useState<Startup | null>(null);
  const [startupDrawerOpen, setStartupDrawerOpen] = useState(false);

  // Compare (firms only)
  const [compareList, setCompareList] = useState<(typeof firms)[0][]>([]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filter areas based on selected city
  const filteredAreas = useMemo(() => {
    if (!city) return allAreas;
    return [...new Set(firms.filter((f) => f.city === city).map((f) => f.area).filter(Boolean))].sort();
  }, [city]);

  const filtered = useMemo(() => {
    return firms.filter((f) => {
      // Channel tab
      const hasEmail = !!f.email;
      if (channel === "email" && !hasEmail) return false;
      if (channel === "phone" && hasEmail) return false;
      
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (city && f.city !== city) return false;
      if (area && f.area !== area) return false;
      if (tier && f.tier !== tier) return false;
      if (type && getType(f) !== type) return false;
      return true;
    });
  }, [search, city, area, tier, type, channel]);

  // Sorted — tier is the primary key; verified only floats within the same tier
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const verifiedWeight = (f: typeof firms[0]) => ((f as { verified?: string }).verified === "verified" ? 1 : 0);
    const tierWeight = (f: typeof firms[0]) => {
      const t = (f.tier || "").toLowerCase();
      const m = t.match(/tier\s*(\d+)/);
      if (m) return parseInt(m[1], 10);
      if (t.includes("individual chamber")) return 5;
      return 6;
    };
    switch (sort) {
      case "rating-desc":
        return arr.sort((a, b) =>
          (tierWeight(a) - tierWeight(b)) ||
          (verifiedWeight(b) - verifiedWeight(a)) ||
          ((Number(b.rating) || 0) - (Number(a.rating) || 0))
        );
      case "name-asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return arr.sort((a, b) => b.name.localeCompare(a.name));
      case "tier":
        return arr.sort((a, b) =>
          (tierWeight(a) - tierWeight(b)) ||
          (verifiedWeight(b) - verifiedWeight(a)) ||
          a.name.localeCompare(b.name)
        );
      default:
        return arr.sort((a, b) =>
          (tierWeight(a) - tierWeight(b)) ||
          (verifiedWeight(b) - verifiedWeight(a)) ||
          ((Number(b.rating) || 0) - (Number(a.rating) || 0)) ||
          a.name.localeCompare(b.name)
        );
    }
  }, [filtered, sort]);


  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, city, area, tier, type, sort, channel]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Type counts
  const typeCounts = useMemo(() => {
    const base = firms.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (city && f.city !== city) return false;
      if (area && f.area !== area) return false;
      if (tier && f.tier !== tier) return false;
      return true;
    });
    return {
      "": base.length,
      "Law Firm": base.filter((f) => getType(f) === "Law Firm").length,
      Chamber: base.filter((f) => getType(f) === "Chamber").length,
      "Individual Advocate": base.filter((f) => getType(f) === "Individual Advocate").length,
    };
  }, [search, city, area, tier]);

  // City counts for map
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((f) => {
      if (f.city) counts[f.city] = (counts[f.city] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  // Active filters
  const activeFilters: { label: string; key: string; clear: () => void }[] = [];
  if (city) activeFilters.push({ label: `City: ${city}`, key: "city", clear: () => { setCity(""); setArea(""); } });
  if (area) activeFilters.push({ label: `Area: ${area}`, key: "area", clear: () => setArea("") });
  if (tier) activeFilters.push({ label: `Tier: ${tier}`, key: "tier", clear: () => setTier("") });
  if (type) activeFilters.push({ label: `Type: ${type}`, key: "type", clear: () => setType("") });

  const clearAll = useCallback(() => {
    setSearchInput(""); setCity(""); setArea(""); setTier(""); setType(""); setSort("relevance");
  }, []);

  const toggleCompare = useCallback((firm: (typeof firms)[0]) => {
    setCompareList((prev) => {
      const exists = prev.find((f) => f.name === firm.name);
      if (exists) return prev.filter((f) => f.name !== firm.name);
      if (prev.length >= 3) return prev;
      return [...prev, firm];
    });
  }, []);

  // ===== Startup filtering =====
  const startupFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return startups.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.sector ?? "").toLowerCase().includes(q)) return false;
      if (sCity && s.city !== sCity) return false;
      if (sSector && s.sector !== sSector) return false;
      if (sStage && s.stage !== sStage) return false;
      if (sSize && s.employees !== sSize) return false;
      if (sLegal && (s.hasLegalDept ?? "").toLowerCase() !== sLegal) return false;
      return true;
    });
  }, [search, sCity, sSector, sStage, sSize, sLegal]);

  const startupSorted = useMemo(() => {
    const arr = [...startupFiltered];
    switch (sort) {
      case "name-asc": return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc": return arr.sort((a, b) => b.name.localeCompare(a.name));
      default: return arr;
    }
  }, [startupFiltered, sort]);

  const startupTotalPages = Math.ceil(startupSorted.length / PAGE_SIZE);
  const startupPaginated = startupSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when startup filters change
  useEffect(() => { setPage(1); }, [search, sCity, sSector, sStage, sSize, sLegal]);

  // Active filter chips for startups
  const startupActiveFilters: { label: string; key: string; clear: () => void }[] = [];
  if (sCity) startupActiveFilters.push({ label: `City: ${sCity}`, key: "sCity", clear: () => setSCity("") });
  if (sSector) startupActiveFilters.push({ label: `Sector: ${sSector}`, key: "sSector", clear: () => setSSector("") });
  if (sStage) startupActiveFilters.push({ label: `Stage: ${sStage}`, key: "sStage", clear: () => setSStage("") });
  if (sSize) startupActiveFilters.push({ label: `Size: ${sSize}`, key: "sSize", clear: () => setSSize("") });
  if (sLegal) startupActiveFilters.push({ label: sLegal === "yes" ? "Has legal team" : "No legal team", key: "sLegal", clear: () => setSLegal("") });

  const clearAllStartups = useCallback(() => {
    setSearchInput(""); setSCity(""); setSSector(""); setSStage(""); setSSize(""); setSLegal(""); setSort("relevance");
  }, []);

  return (
    <main className="pt-24 pb-16">
      {/* Hero */}
      <section className="container mx-auto px-4 md:px-8 mb-8 text-center">
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
          Find Firms, Chambers{" "}
          <span className="text-accent">&amp; Companies</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
          {mode === "firms"
            ? `Explore ${firms.length.toLocaleString()} law firms, chambers, and legal practices across India.`
            : `Browse ${startups.length.toLocaleString()} startups & SMEs hiring legal talent across India.`}
        </p>

        {/* Mode toggle */}
        <div className="inline-flex items-center bg-card border border-border rounded-full p-1">
          <button
            onClick={() => setMode("firms")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
              mode === "firms" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 size={14} /> Law Firms
          </button>
          <button
            onClick={() => setMode("startups")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
              mode === "startups" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rocket size={14} /> Startups &amp; SMEs
          </button>
        </div>
      </section>


      {mode === "firms" && (
        <section className="container mx-auto px-4 md:px-8 mb-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-stretch border-2 border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <button
                onClick={() => setChannel("email")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                  channel === "email" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Mail size={14} /> Mail Now
                <span className="font-mono text-[11px] opacity-80">· {mailNowCount.toLocaleString()}</span>
              </button>
              <button
                onClick={() => setChannel("phone")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-l-2 border-foreground transition-colors ${
                  channel === "phone" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Phone size={14} /> Cold Call
                <span className="font-mono text-[11px] opacity-80">· {coldCallCount.toLocaleString()}</span>
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {channel === "email"
              ? "Firms with a public email — best matched to the cold-mail playbook."
              : "Phone-only firms — best for ground-level cold calling."}
          </p>
        </section>
      )}

      {/* Live vacancies teaser — appears above filters when there are live postings */}
      

      {mode === "firms" && (<>
      {/* Bar leaderboard callout */}
      <section className="container mx-auto px-4 md:px-8 mb-6">
        <Link
          to="/the-bar/leaderboard"
          className="block bg-card border-2 border-accent/40 hover:border-accent rounded-2xl p-4 md:p-5 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <Trophy size={20} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground text-sm md:text-base">Looking for students? Check out the Bar leaderboard</p>
              <p className="text-xs md:text-sm text-muted-foreground">Students ranked by legal skill, not just college.</p>
            </div>
            <ArrowRight size={18} className="text-accent shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* Filters — single line */}
      <FilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by firm name…"
        filters={[
          {
            label: "City",
            value: city,
            options: allCities.map((c) => ({ label: c, value: c })),
            onChange: (v) => { setCity(v); setArea(""); },
          },
          {
            label: "Area",
            value: area,
            options: filteredAreas.map((a) => ({ label: a, value: a })),
            onChange: setArea,
          },
          {
            label: "Tier",
            value: tier,
            options: allTiers.map((t) => ({ label: t, value: t })),
            onChange: setTier,
          },
          {
            label: "Type",
            value: type,
            options: typeFilters.filter((t) => t.value).map((t) => ({
              label: `${t.label} (${typeCounts[t.value]?.toLocaleString() ?? 0})`,
              value: t.value,
            })),
            onChange: (v) => setType(v as FirmType | ""),
          },
        ]}
        sort={{
          value: sort,
          options: sortOptions.filter((s) => s.value !== "relevance"),
          onChange: (v) => setSort(v as SortOption),
        }}
        view={view}
        onViewChange={setView}
        showViewToggle
        onClearAll={clearAll}
        activeCount={activeFilters.length}
      />

      {/* Results count */}
      <section className="container mx-auto px-4 md:px-8 mb-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{sorted.length.toLocaleString()}</span> results
          {activeFilters.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">· {activeFilters.length} filter{activeFilters.length === 1 ? "" : "s"} applied</span>
          )}
        </p>
      </section>


      {/* Content */}
      <section className="container mx-auto px-4 md:px-8">
        {view === "map" ? (
          <DirectoryMap cityCounts={cityCounts} selectedCity={city} onCitySelect={(c) => { setCity(c); setArea(""); }} />
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="mx-auto mb-4 opacity-40" size={48} />
            <p className="text-lg">No firms match your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((f, i) => {
                const isCompared = compareList.some((c) => c.name === f.name);
                return (
                  <div
                    key={`${f.name}-${i}`}
                    className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 cursor-pointer relative animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: "both" }}
                    onClick={() => { setDrawerFirm(f); setDrawerOpen(true); }}
                  >
                    {/* Top-right actions: Share always; Compare reveals on hover or when active */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                      <ShareIconButton
                        size="sm"
                        label="Share this firm"
                        onShare={async () => {
                          const slug = encodeURIComponent(f.name);
                          const url = withRef(`https://locus.legal/directory?firm=${slug}`, "firm-card");
                          const text = `${f.name}${f.city ? `, ${f.city}` : ""} — found via Locus`;
                          const r = await shareOrCopy({ title: "Locus — Firm Directory", text, url });
                          if (r === "copied") toast.success("Link copied");
                        }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCompare(f); }}
                        className={`h-7 w-7 rounded-md border-2 flex items-center justify-center transition-all ${
                          isCompared
                            ? "bg-accent border-accent text-accent-foreground opacity-100"
                            : compareList.length > 0
                              ? "border-border/60 text-muted-foreground hover:border-accent hover:text-accent opacity-100"
                              : "border-border/40 text-muted-foreground hover:border-accent hover:text-accent opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        }`}
                        title={isCompared ? "Remove from compare" : "Add to compare"}
                        aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                      >
                        <GitCompareArrows size={12} />
                      </button>
                    </div>

                    <div className="mb-3 pr-10">
                      <h3 className="font-heading text-base font-bold leading-tight group-hover:text-accent transition-colors line-clamp-2">
                        {f.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {f.tier}
                      </span>
                      <span className="text-[11px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        {getType(f)}
                      </span>
                      {(f as { verified?: string }).verified === "verified" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-accent text-accent-foreground border border-foreground px-2 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      )}
                      {f.rating && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent ml-auto whitespace-nowrap">
                          <Star size={11} className="fill-accent" /> {f.rating}
                        </span>
                      )}
                    </div>

                    {f.address && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                        {f.address}
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin size={12} className="shrink-0" />
                        <span>{f.area}{f.area && f.city ? ", " : ""}{f.city}</span>
                      </div>
                      {f.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone size={12} className="shrink-0" />
                          <span>{f.phone}</span>
                        </div>
                      )}
                      {f.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{f.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
      </>)}

      {/* ===== Startups & SMEs branch ===== */}
      {mode === "startups" && (<>
        <FilterBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search by company or sector…"
          filters={[
            {
              label: "City",
              value: sCity,
              options: startupCities.map((c) => ({ label: c, value: c })),
              onChange: setSCity,
            },
            {
              label: "Sector",
              value: sSector,
              options: startupSectors.map((s) => ({ label: s, value: s })),
              onChange: setSSector,
            },
            {
              label: "Stage",
              value: sStage,
              options: startupStages.map((s) => ({ label: s, value: s })),
              onChange: setSStage,
            },
            {
              label: "Size",
              value: sSize,
              options: startupSizes.map((sz) => ({ label: `${sz} employees`, value: sz })),
              onChange: setSSize,
            },
            {
              label: "Legal Team",
              value: sLegal,
              options: [
                { label: "Has in-house legal team", value: "yes" },
                { label: "No in-house legal team", value: "no" },
              ],
              onChange: (v) => setSLegal(v as "" | "yes" | "no"),
            },
          ]}
          sort={{
            value: sort,
            options: [
              { label: "Name (A → Z)", value: "name-asc" },
              { label: "Name (Z → A)", value: "name-desc" },
            ],
            onChange: (v) => setSort(v as SortOption),
          }}
          showViewToggle={false}
          onClearAll={clearAllStartups}
          activeCount={startupActiveFilters.length}
        />

        <section className="container mx-auto px-4 md:px-8 mb-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{startupSorted.length.toLocaleString()}</span> startups &amp; SMEs
            {startupActiveFilters.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">· {startupActiveFilters.length} filter{startupActiveFilters.length === 1 ? "" : "s"} applied</span>
            )}
          </p>
        </section>


        <section className="container mx-auto px-4 md:px-8">
          {startupSorted.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Rocket className="mx-auto mb-4 opacity-40" size={48} />
              <p className="text-lg">No startups match your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {startupPaginated.map((s, i) => (
                  <div
                    key={`${s.name}-${i}`}
                    className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 cursor-pointer animate-fade-in relative"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: "both" }}
                    onClick={() => { setDrawerStartup(s); setStartupDrawerOpen(true); }}
                  >
                    <div className="absolute top-3 right-3 z-10">
                      <ShareIconButton
                        size="sm"
                        label="Share this startup"
                        onShare={async () => {
                          const slug = encodeURIComponent(s.name);
                          const url = withRef(`https://locus.legal/directory?mode=startups&startup=${slug}`, "startup-card");
                          const parts = [s.name, s.city, s.sector].filter(Boolean).join(" · ");
                          const r = await shareOrCopy({ title: "Locus — Startups & SMEs", text: `${parts} — found via Locus`, url });
                          if (r === "copied") toast.success("Link copied");
                        }}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-3 pr-10">
                      <h3 className="font-heading text-base font-bold leading-tight group-hover:text-accent transition-colors line-clamp-2">{s.name}</h3>
                      {s.hasLegalDept?.toLowerCase() === "yes" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                          <Scale size={10} /> Legal
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {s.stage && <span className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{s.stage}</span>}
                      {s.sector && <span className="text-[11px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{s.sector}</span>}
                    </div>
                    {s.legalNeeds && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{s.legalNeeds}</p>
                    )}
                    <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-border/30">
                      {s.city && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={12} className="shrink-0" /><span>{s.city}</span></div>
                      )}
                      {s.employees && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users size={12} className="shrink-0" /><span>{s.employees}</span></div>
                      )}
                      {s.website && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe size={12} className="shrink-0" /><span className="truncate">{s.website}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {startupTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Previous</button>
                  <span className="text-sm text-muted-foreground px-3">Page {page} of {startupTotalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(startupTotalPages, p + 1))} disabled={page === startupTotalPages} className="px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </>)}


      {/* Firm detail drawer */}
      <FirmDrawer
        firm={drawerFirm}
        type={drawerFirm ? getType(drawerFirm) : "Law Firm"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Startup detail drawer */}
      <StartupDrawer
        startup={drawerStartup}
        open={startupDrawerOpen}
        onOpenChange={setStartupDrawerOpen}
      />

      {/* Compare bar */}
      <CompareBar
        selected={compareList}
        onRemove={(name) => setCompareList((prev) => prev.filter((f) => f.name !== name))}
        onClear={() => setCompareList([])}
      />

      {/* Spacer for compare bar */}
      {compareList.length > 0 && <div className="h-20" />}
    </main>
  );
}
