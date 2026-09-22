import { directionsLinks } from "@/lib/directions";
import { formatDistance } from "@/lib/geo/haversine";
import type { StationDTO } from "@/types/stations";

export interface PopupLabels {
  distanceAway: (distance: string) => string;
  viewDetails: string;
  directions: string;
  disclaimer: string;
  status: (s: string) => string;
  fuelName: (f: { nameEn: string; nameAm: string }) => string;
}

const STATUS_ICON: Record<string, string> = { AVAILABLE: "🟢", LIMITED: "🟡", OUT_OF_STOCK: "🔴", UNKNOWN: "⚪" };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent only: station data can never inject markup
  return e;
}

/** Popup content for a map marker, built with DOM APIs. */
export function buildStationPopup(
  s: StationDTO,
  distanceKm: number | null,
  labels: PopupLabels,
  handlers: { onDetails: (id: string) => void; onDirections: (url: string) => void },
): HTMLElement {
  const root = el("div", "taf-popup");
  root.append(el("strong", "taf-popup__title", `TAF ${s.branchName}`));
  root.append(el("div", "taf-popup__addr", `📍 ${[s.area, s.city].filter(Boolean).join(", ")}`));

  const ul = el("ul", "taf-popup__fuels");
  for (const f of s.fuels) {
    const li = el("li", "taf-popup__fuel", `${STATUS_ICON[f.status] ?? "⚪"} ${labels.fuelName(f)} — ${labels.status(f.status)}${f.isStale ? " ⚠️" : ""}`);
    ul.append(li);
  }
  root.append(ul);
  if (distanceKm !== null) root.append(el("div", "taf-popup__dist", labels.distanceAway(formatDistance(distanceKm))));

  const actions = el("div", "taf-popup__actions");
  const details = el("button", "taf-popup__btn", labels.viewDetails);
  details.type = "button";
  details.addEventListener("click", () => handlers.onDetails(s.id));
  const url = directionsLinks(s.latitude, s.longitude, `TAF ${s.branchName}`)[0]!.url;
  const dir = el("a", "taf-popup__btn taf-popup__btn--primary", labels.directions);
  dir.href = url;
  dir.target = "_blank";
  dir.rel = "noopener noreferrer";
  dir.addEventListener("click", (e) => {
    e.preventDefault();
    handlers.onDirections(url);
  });
  actions.append(details, dir);
  root.append(actions);
  root.append(el("div", "taf-popup__note", labels.disclaimer));
  return root;
}
