interface CityData {
  name: string;
  count: number;
  x: number;
  y: number;
}

interface DirectoryMapProps {
  cityCounts: Record<string, number>;
  selectedCity: string;
  onCitySelect: (city: string) => void;
}

// Approximate positions on a 500x550 SVG canvas for major Indian cities
const cityPositions: Record<string, { x: number; y: number }> = {
  "New Delhi": { x: 240, y: 145 },
  Delhi: { x: 240, y: 145 },
  Mumbai: { x: 150, y: 310 },
  Bengaluru: { x: 210, y: 430 },
  Bangalore: { x: 210, y: 430 },
  Chennai: { x: 260, y: 420 },
  Kolkata: { x: 355, y: 250 },
  Hyderabad: { x: 230, y: 360 },
  Pune: { x: 170, y: 330 },
  Ahmedabad: { x: 140, y: 250 },
  Jaipur: { x: 200, y: 185 },
  Lucknow: { x: 290, y: 185 },
  Chandigarh: { x: 230, y: 120 },
  Kochi: { x: 200, y: 465 },
  Gurgaon: { x: 232, y: 155 },
  Gurugram: { x: 232, y: 155 },
  Noida: { x: 250, y: 155 },
  Indore: { x: 195, y: 270 },
  Bhopal: { x: 225, y: 265 },
  Nagpur: { x: 245, y: 295 },
  Guwahati: { x: 405, y: 195 },
  Patna: { x: 330, y: 205 },
  Dehradun: { x: 245, y: 115 },
  Thiruvananthapuram: { x: 200, y: 490 },
  Coimbatore: { x: 220, y: 445 },
  Vadodara: { x: 145, y: 265 },
  Surat: { x: 140, y: 280 },
  Visakhapatnam: { x: 290, y: 360 },
};

export default function DirectoryMap({ cityCounts, selectedCity, onCitySelect }: DirectoryMapProps) {
  const cities: CityData[] = Object.entries(cityCounts)
    .filter(([name]) => cityPositions[name])
    .map(([name, count]) => ({
      name,
      count,
      ...cityPositions[name],
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...cities.map((c) => c.count), 1);

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
      <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: "500/550" }}>
        <svg viewBox="0 0 500 550" className="w-full h-full">
          {/* India outline (simplified) */}
          <path
            d="M230,50 C180,55 140,80 120,110 C100,140 90,170 85,200 C80,230 75,260 80,290 C85,310 100,320 110,340 C115,350 120,360 130,380 C140,400 155,420 165,440 C175,460 185,475 195,490 C200,500 210,510 225,510 C235,505 240,495 250,480 C260,465 270,450 280,435 C290,420 295,405 300,390 C310,370 315,355 310,335 C305,310 315,290 330,270 C345,250 360,235 370,215 C380,195 385,180 380,160 C375,140 370,125 360,110 C350,95 330,80 310,70 C290,60 265,50 245,50 Z"
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            className="opacity-60"
          />

          {/* City dots */}
          {cities.map((city) => {
            const isSelected = selectedCity === city.name;
            const radius = Math.max(6, Math.min(20, (city.count / maxCount) * 20));

            return (
              <g
                key={city.name}
                className="cursor-pointer"
                onClick={() => onCitySelect(isSelected ? "" : city.name)}
              >
                {/* Pulse ring for selected */}
                {isSelected && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={radius + 6}
                    fill="none"
                    stroke="hsl(var(--accent))"
                    strokeWidth="2"
                    className="animate-pulse"
                    opacity="0.5"
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={radius}
                  fill={isSelected ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.6)"}
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className="transition-all duration-300 hover:opacity-80"
                />
                {/* Count label */}
                <text
                  x={city.x}
                  y={city.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-accent-foreground font-bold pointer-events-none"
                  fontSize={radius > 10 ? "9" : "7"}
                >
                  {city.count > 999 ? `${(city.count / 1000).toFixed(0)}k` : city.count}
                </text>
                {/* City name label */}
                <text
                  x={city.x}
                  y={city.y + radius + 12}
                  textAnchor="middle"
                  className="fill-foreground pointer-events-none"
                  fontSize="9"
                  fontWeight={isSelected ? "700" : "500"}
                  opacity={isSelected ? 1 : 0.7}
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">Click a city to filter • Dot size = firm count</p>
    </div>
  );
}
