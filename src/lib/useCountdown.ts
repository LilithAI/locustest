import { useEffect, useState } from "react";

export interface CountdownInfo {
  label: string;
  totalMs: number;
  expired: boolean;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function compute(expiresAt: string): CountdownInfo {
  const totalMs = new Date(expiresAt).getTime() - Date.now();
  if (totalMs <= 0) return { label: "Closed", totalMs: 0, expired: true };

  const sec = Math.floor(totalMs / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  let label: string;
  if (days >= 1) label = `${days}d ${pad(hours)}h`;
  else if (hours >= 1) label = `${pad(hours)}h ${pad(mins)}m`;
  else label = `${pad(mins)}:${pad(secs)}`;

  return { label, totalMs, expired: false };
}

/**
 * Live countdown to a future ISO timestamp.
 * Ticks every second when <1h remains, otherwise every 30s.
 */
export function useCountdown(expiresAt: string): CountdownInfo {
  const [info, setInfo] = useState<CountdownInfo>(() => compute(expiresAt));

  useEffect(() => {
    setInfo(compute(expiresAt));
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const next = compute(expiresAt);
      setInfo(next);
      const desired = next.totalMs > 3600 * 1000 ? 30000 : 1000;
      if (interval) clearInterval(interval);
      if (!next.expired) interval = setInterval(tick, desired);
    };

    tick();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expiresAt]);

  return info;
}
