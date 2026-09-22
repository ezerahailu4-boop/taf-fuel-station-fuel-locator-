import type { StationDTO } from "@/types/stations";

export type Tone = "available" | "limited" | "out" | "unknown" | "closed";

/**
 * One tone per station for map pins / summaries.
 * A station that is not OPEN is "closed" regardless of what its fuel rows say.
 */
export function stationTone(s: Pick<StationDTO, "status" | "fuels">): Tone {
  if (s.status !== "OPEN") return "closed";
  const st = s.fuels.map((f) => f.status);
  if (st.includes("AVAILABLE")) return "available";
  if (st.includes("LIMITED")) return "limited";
  if (st.includes("OUT_OF_STOCK")) return "out";
  return "unknown";
}

/** Tone for one selected fuel (falls back to the overall tone when no fuel is selected). */
export function stationToneForFuel(s: Pick<StationDTO, "status" | "fuels">, fuelSlug: string | null): Tone {
  if (!fuelSlug) return stationTone(s);
  if (s.status !== "OPEN") return "closed";
  const f = s.fuels.find((x) => x.slug === fuelSlug);
  if (!f) return "unknown";
  return f.status === "AVAILABLE" ? "available" : f.status === "LIMITED" ? "limited" : f.status === "OUT_OF_STOCK" ? "out" : "unknown";
}

/** Text glyph so pins never rely on color alone. */
export const TONE_GLYPH: Record<Tone, string> = {
  available: "✓",
  limited: "!",
  out: "✕",
  unknown: "?",
  closed: "−",
};
