import type { TramLineId } from "./types";

export type TramLine = {
  id: TramLineId;
  longName: string;
  tur: string;
  retur: string;
};

export const TRAM_LINES: TramLine[] = [
  {
    id: "1",
    longName: "Gara de Nord — AEM",
    tur: "Piața Gh. Domășneanu",
    retur: "Gara de Nord",
  },
  {
    id: "2",
    longName: "Shopping City — Torontal",
    tur: "Calea Torontalului",
    retur: "Shopping City",
  },
  {
    id: "4",
    longName: "Torontal — AEM",
    tur: "Piața Gh. Domășneanu",
    retur: "Calea Torontalului",
  },
  {
    id: "7",
    longName: "Dâmbovița — Torontal",
    tur: "Calea Torontalului",
    retur: "Bulevardul Dâmbovița",
  },
  {
    id: "8",
    longName: "Gara de Nord — AEM",
    tur: "Piața Gh. Domășneanu",
    retur: "Gara de Nord",
  },
  {
    id: "9",
    longName: "Gara de Nord — AEM",
    tur: "Piața Gh. Domășneanu",
    retur: "Gara de Nord",
  },
];

export const LINE_BY_ID = Object.fromEntries(
  TRAM_LINES.map((line) => [line.id, line]),
) as Record<TramLineId, TramLine>;

export const TM_CENTER = { lat: 45.756, lng: 21.2287 };
export const TM_DEFAULT_ZOOM = 13.1;

export function isTramRoute(route: string | undefined | null): boolean {
  if (!route) return false;
  return TRAM_LINES.some((line) => line.id === route);
}
