import type { Stop } from "./types";

export type LandmarkKind = "basarab" | "mocioni" | "maria";

export const LANDMARK_META: Record<
  LandmarkKind,
  { color: string; ink: string; mapLabel: string; labelRo: string; labelEn: string }
> = {
  basarab: {
    color: "#3DDC97",
    ink: "#052e16",
    mapLabel: "MB",
    labelRo: "Matei Basarab",
    labelEn: "Matei Basarab",
  },
  mocioni: {
    color: "#A78BFA",
    ink: "#1a1028",
    mapLabel: "P.Mocioni",
    labelRo: "Piața Mocioni",
    labelEn: "Mocioni Square",
  },
  maria: {
    color: "#FF5A5A",
    ink: "#fff7f7",
    mapLabel: "P.Maria",
    labelRo: "Piața Maria",
    labelEn: "Maria Square",
  },
};

export const LANDMARK_FALLBACK: Record<LandmarkKind, { lat: number; lng: number }> = {
  basarab: { lat: 45.76778, lng: 21.21677 },
  mocioni: { lat: 45.74628, lng: 21.21527 },
  maria: { lat: 45.74852, lng: 21.21899 },
};

export const CNB = {
  lat: 45.74462,
  lng: 21.2135,
  label: "CNB",
  name: "Colegiul Național Bănățean",
  color: "#f2f0ea",
  ink: "#090a0c",
};

function fold(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function landmarkKindForStop(name: string): LandmarkKind | null {
  const n = fold(name);
  if (n.includes("matei basarab")) return "basarab";
  if (n.includes("mocioni")) return "mocioni";
  if (n.includes("sfanta maria") || n.includes("piata maria")) return "maria";
  return null;
}

export function splitLandmarkStops(stops: Stop[]) {
  const landmarks: Array<Stop & { kind: LandmarkKind }> = [];
  const rest: Stop[] = [];
  for (const stop of stops) {
    const kind = landmarkKindForStop(stop.name);
    if (kind) landmarks.push({ ...stop, kind });
    else rest.push(stop);
  }
  return { landmarks, rest };
}

export function landmarkAnchors(stops: Stop[]) {
  const groups: Record<LandmarkKind, Stop[]> = { basarab: [], mocioni: [], maria: [] };
  for (const stop of stops) {
    const kind = landmarkKindForStop(stop.name);
    if (kind) groups[kind].push(stop);
  }
  return (Object.keys(LANDMARK_META) as LandmarkKind[]).map((kind) => {
    const list = groups[kind];
    const fallback = LANDMARK_FALLBACK[kind];
    const lat = list.length ? list.reduce((sum, s) => sum + s.lat, 0) / list.length : fallback.lat;
    const lon = list.length ? list.reduce((sum, s) => sum + s.lon, 0) / list.length : fallback.lng;
    return { kind, lat, lon, stop: list[0] ?? null, ...LANDMARK_META[kind] };
  });
}
