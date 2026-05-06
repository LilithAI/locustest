import { Search, ArrowUpDown, LayoutGrid, Map as MapIcon, X } from "lucide-react";
import FilterDropdown from "./FilterDropdown";
import MobileFilterSheet from "./MobileFilterSheet";
import { cn } from "@/lib/utils";

export type FilterDef = {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
};

export type SortDef = {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
};

interface FilterBarProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters: FilterDef[];
  sort: SortDef;
  view?: "grid" | "map";
  onViewChange?: (v: "grid" | "map") => void;
  showViewToggle?: boolean;
  onClearAll: () => void;
  activeCount: number;
}

export default function FilterBar({
  searchInput,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  sort,
  view = "grid",
  onViewChange,
  showViewToggle = true,
  onClearAll,
  activeCount,
}: FilterBarProps) {
  return (
    <section className="container mx-auto px-4 md:px-8 mb-6">
      <div className="flex items-center gap-2">
        {/* Search — flex grows */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={16}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 bg-card border-2 border-foreground/70 rounded-lg pl-9 pr-9 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:shadow-[3px_3px_0_0_hsl(var(--accent))] transition-all"
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Desktop: inline filters + sort */}
        <div className="hidden lg:flex items-center gap-2">
          {filters.map((f) => (
            <FilterDropdown
              key={f.label}
              label={f.label}
              value={f.value}
              options={f.options}
              onChange={f.onChange}
            />
          ))}
          <FilterDropdown
            label="Sort"
            value={sort.value === "relevance" ? "" : sort.value}
            options={sort.options}
            onChange={(v) => sort.onChange(v || "relevance")}
            searchable={false}
          />
        </div>

        {/* Mobile/tablet: filters collapse into sheet */}
        <div className="lg:hidden">
          <MobileFilterSheet activeCount={activeCount} onClearAll={onClearAll}>
            {filters.map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </label>
                <FilterDropdown
                  label={f.label}
                  value={f.value}
                  options={f.options}
                  onChange={f.onChange}
                  className="w-full justify-between"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown size={12} /> Sort
              </label>
              <FilterDropdown
                label="Sort"
                value={sort.value === "relevance" ? "" : sort.value}
                options={sort.options}
                onChange={(v) => sort.onChange(v || "relevance")}
                searchable={false}
                className="w-full justify-between"
              />
            </div>
          </MobileFilterSheet>
        </div>

        {/* View toggle (always visible if enabled) */}
        {showViewToggle && onViewChange && (
          <div className="inline-flex items-center bg-card border-2 border-foreground/70 rounded-lg overflow-hidden h-11">
            <button
              onClick={() => onViewChange("grid")}
              aria-label="Grid view"
              className={cn(
                "h-full px-2.5 transition-colors",
                view === "grid"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => onViewChange("map")}
              aria-label="Map view"
              className={cn(
                "h-full px-2.5 transition-colors border-l-2 border-foreground/70",
                view === "map"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon size={16} />
            </button>
          </div>
        )}

        {/* Desktop: clear-all when active */}
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="hidden lg:inline-flex items-center gap-1 h-11 px-3 rounded-lg border-2 border-foreground/30 bg-transparent text-xs font-bold text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            aria-label="Clear all filters"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </section>
  );
}
