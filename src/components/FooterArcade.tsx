import { useState, useCallback, useEffect, useRef } from "react";

// ── SVG SYMBOLS ──────────────────────────────────────────────────────────────

// Card back: a single calm Locus monogram dot. Replaces the previous 4-symbol
// composite that turned every card into visual noise.
const BACK = `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
  <circle cx="30" cy="30" r="11" fill="none" stroke="hsl(45,100%,51%)" stroke-width="2.4"/>
  <circle cx="30" cy="30" r="3.2" fill="hsl(45,100%,51%)"/>
</svg>`;

// 8 distinct front symbols → 8 pairs → 16 cards on a 4×4 grid.
const SYM = [
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <circle cx="10" cy="12" r="4.5" fill="#000"/><circle cx="10" cy="48" r="4.5" fill="#000"/><circle cx="52" cy="30" r="4.5" fill="#000"/>
    <line x1="10" y1="12" x2="52" y2="30" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="10" y1="48" x2="52" y2="30" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <circle cx="30" cy="30" r="18" fill="none" stroke="#000" stroke-width="3.2"/>
    <line x1="30" y1="10" x2="30" y2="50" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="10" y1="30" x2="50" y2="30" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <polygon points="30,7 53,30 30,53 7,30" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round"/>
    <polygon points="30,17 43,30 30,43 17,30" fill="#000"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <polygon points="30,7 55,51 5,51" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round"/>
    <line x1="30" y1="20" x2="30" y2="37" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="30" cy="44" r="3.2" fill="#000"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <circle cx="30" cy="30" r="20" fill="none" stroke="#000" stroke-width="3"/>
    <circle cx="30" cy="30" r="12" fill="none" stroke="#000" stroke-width="3"/>
    <circle cx="30" cy="30" r="4.5" fill="#000"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <line x1="30" y1="52" x2="30" y2="13" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
    <polyline points="16,27 30,11 44,27" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="17" y1="52" x2="43" y2="52" stroke="#000" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <rect x="13" y="13" width="34" height="34" rx="3" fill="none" stroke="#000" stroke-width="3.2" transform="rotate(45 30 30)"/>
    <circle cx="30" cy="30" r="5.5" fill="#000"/>
  </svg>`,
  `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <polyline points="37,7 21,32 33,32 23,53" fill="none" stroke="#000" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,
];

// ── STYLES ────────────────────────────────────────────────────────────────────

const arcadeStyles = `
.fa-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  max-width: 640px;
  width: 100%;
}
@media (max-width: 520px) {
  .fa-grid { grid-template-columns: repeat(8, 1fr); gap: 5px; }
}
.fa-card {
  aspect-ratio: 1;
  cursor: pointer;
  perspective: 700px;
  border-radius: 8px;
}
.fa-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.42s cubic-bezier(0.4, 0.2, 0.2, 1);
  border-radius: 8px;
}
.fa-card.flipped .fa-card-inner,
.fa-card.matched .fa-card-inner {
  transform: rotateY(180deg);
}
.fa-card-face {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.fa-card-back { background: hsl(0, 0%, 15%); }
.fa-card-front { background: hsl(45, 100%, 51%); transform: rotateY(180deg); }
.fa-card.matched .fa-card-front { opacity: 0.68; }
.fa-card:not(.flipped):not(.matched):hover .fa-card-back {
  background: hsl(0, 0%, 20%);
  transition: background 0.18s;
}
@keyframes fa-shake {
  0%,100% { transform: rotateY(180deg) translateX(0); }
  20%     { transform: rotateY(180deg) translateX(-6px); }
  40%     { transform: rotateY(180deg) translateX(6px); }
  60%     { transform: rotateY(180deg) translateX(-4px); }
  80%     { transform: rotateY(180deg) translateX(4px); }
}
.fa-card.wrong .fa-card-inner { animation: fa-shake 0.38s ease; }
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────

interface Card { sym: number; id: number; }

function shuffle<T>(arr: T[]): T[] {
  const b = [...arr];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const pad = (n: number) => String(n).padStart(2, "0");

const PAIR_COUNT = 8;

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function FooterArcade() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedSyms, setMatchedSyms] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const locked = useRef(false);

  const initGame = useCallback(() => {
    const symIndices = Array.from({ length: PAIR_COUNT }, (_, i) => i);
    const deck = shuffle([...symIndices, ...symIndices]).map((sym, id) => ({ sym, id }));
    setCards(deck);
    setFlippedIndices([]);
    setMatchedSyms(new Set());
    setWrongPair(new Set());
    setMoves(0);
    setWon(false);
    locked.current = false;
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  const handleFlip = useCallback((index: number) => {
    if (locked.current) return;
    if (flippedIndices.includes(index)) return;
    if (matchedSyms.has(cards[index].sym)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      locked.current = true;
      const newMoves = moves + 1;
      setMoves(newMoves);

      const [a, b] = newFlipped;
      if (cards[a].sym === cards[b].sym) {
        const newMatched = new Set(matchedSyms);
        newMatched.add(cards[a].sym);
        setMatchedSyms(newMatched);
        setFlippedIndices([]);
        locked.current = false;
        if (newMatched.size === PAIR_COUNT) {
          setTimeout(() => setWon(true), 500);
        }
      } else {
        setTimeout(() => {
          setWrongPair(new Set([a, b]));
          setTimeout(() => {
            setFlippedIndices([]);
            setWrongPair(new Set());
            locked.current = false;
          }, 380);
        }, 700);
      }
    }
  }, [cards, flippedIndices, matchedSyms, moves]);

  const isFlipped = (i: number) => flippedIndices.includes(i) || matchedSyms.has(cards[i]?.sym);
  const isMatched = (i: number) => matchedSyms.has(cards[i]?.sym);
  const isWrong = (i: number) => wrongPair.has(i);

  return (
    <section className="relative py-6 px-4 bg-background border-t border-foreground/10">
      <style>{arcadeStyles}</style>

      <div className="flex flex-col items-center max-w-[640px] mx-auto">
        {/* HUD — single tight line above the strip */}
        <div className="w-full flex justify-between items-center mb-2.5">
          <span className="text-foreground/70 text-[11px] font-mono tracking-wider uppercase">
            Match the pairs
          </span>
          <div className="flex items-center gap-2">
            <span className="text-foreground/60 text-[10px] font-mono tracking-wider uppercase">Moves</span>
            <span className="border border-muted-foreground/25 rounded px-2 py-0.5 text-foreground text-[11px] font-mono tracking-wider min-w-[36px] text-center">
              {pad(moves)}
            </span>
          </div>
        </div>

        {/* GRID — horizontal 8×2 strip */}
        <div className="fa-grid">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className={`fa-card${isFlipped(i) ? " flipped" : ""}${isMatched(i) ? " matched" : ""}${isWrong(i) ? " wrong" : ""}`}
              onClick={() => handleFlip(i)}
            >
              <div className="fa-card-inner">
                <div className="fa-card-face fa-card-back" dangerouslySetInnerHTML={{ __html: BACK }} />
                <div className="fa-card-face fa-card-front" dangerouslySetInnerHTML={{ __html: SYM[card.sym] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WIN OVERLAY */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 transition-opacity duration-500 ${won ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "hsla(0, 0%, 3%, 0.93)" }}
      >
        <span className="font-heading font-extrabold text-foreground text-5xl">You won</span>
        <span className="text-muted-foreground text-[15px] font-mono">
          Completed in {moves} move{moves === 1 ? "" : "s"}
        </span>
        <button
          onClick={initGame}
          className="mt-2.5 bg-accent text-accent-foreground border-none rounded-lg px-10 py-3.5 font-mono text-sm tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
        >
          Play again
        </button>
      </div>
    </section>
  );
}
