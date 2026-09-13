import type { Alert, Arrival, GeoJsonFeatureCollection, RouteDetail, Stop, VehiclesPayload } from "./stpt/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  vehicles: () => getJson<VehiclesPayload>("/api/stpt/vehicles"),
  stops: () => getJson<Stop[]>("/api/stpt/stops"),
  alerts: () => getJson<Alert[]>("/api/stpt/alerts"),
  network: () => getJson<GeoJsonFeatureCollection>("/api/stpt/network"),
  arrivals: (stopId: string) =>
    getJson<Arrival[]>(`/api/stpt/arrivals?stopId=${encodeURIComponent(stopId)}`),
  route: (id: string, dir: "tur" | "retur") =>
    getJson<RouteDetail>(`/api/stpt/route?id=${encodeURIComponent(id)}&dir=${dir}`),
};
