type Stats = {
  total: number;
  pending: number;
  interviews: number;
  offers: number;
  responseRate: number;
};

const Cell = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex-1 min-w-[120px] border-2 border-border bg-card px-4 py-3 shadow-[3px_3px_0_0_hsl(var(--border))]">
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-1 font-heading text-2xl font-extrabold text-foreground">{value}</div>
  </div>
);

export default function StatsStrip({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Cell label="Total" value={stats.total} />
      <Cell label="Pending" value={stats.pending} />
      <Cell label="Interviews" value={stats.interviews} />
      <Cell label="Offers" value={stats.offers} />
      <Cell label="Response rate" value={`${stats.responseRate}%`} />
    </div>
  );
}
