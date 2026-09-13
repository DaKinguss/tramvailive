import { TRAM_LINES } from "./lines";
import { TRAM_LINE_SET, type Alert, type Arrival, type GeoJsonFeatureCollection, type RouteDetail, type Stop, type Vehicle, type VehiclesPayload } from "./types";

const STPT = "https://live.stpt.ro";

type CacheEntry<T> = { expires: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function stptFetch(path: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${STPT}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`STPT ${res.status} for ${path}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function isTramVehicle(vehicle: Vehicle): boolean {
  if (vehicle.routeId?.startsWith("R_TV_")) return true;
  return TRAM_LINE_SET.has(vehicle.route);
}

export async function fetchVehicles(): Promise<VehiclesPayload> {
  const cached = getCached<VehiclesPayload>("vehicles");
  try {
    const res = await stptFetch("/gtfs-vehicles.php");
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        vehicles?: Vehicle[];
        total?: number;
        generated_at?: number;
        age_seconds?: number;
        is_stale?: boolean;
        live_status?: string;
        live_status_reason?: string | null;
      };
    };
    const all = Array.isArray(json.data?.vehicles) ? json.data.vehicles : [];
    const vehicles = all.filter(isTramVehicle);
    const payload: VehiclesPayload = {
      vehicles,
      total: vehicles.length,
      generatedAt: (json.data?.generated_at ?? Date.now() / 1000) * 1000,
      ageSeconds: json.data?.age_seconds ?? 0,
      isStale: Boolean(json.data?.is_stale),
      liveStatus: json.data?.live_status ?? "ok",
      liveStatusReason: json.data?.live_status_reason ?? null,
    };
    setCached("vehicles", payload, 4000);
    return payload;
  } catch (error) {
    if (cached) return { ...cached, isStale: true, liveStatus: "cached" };
    throw error;
  }
}

export async function fetchStops(): Promise<Stop[]> {
  const cached = getCached<Stop[]>("stops");
  if (cached) return cached;
  const res = await stptFetch("/gtfs-data/stops-index.json", 12000);
  const json = (await res.json()) as Record<
    string,
    {
      stop_name: string;
      lat: number;
      lon: number;
      routes?: string[];
      is_terminal?: boolean;
    }
  >;
  const stops: Stop[] = Object.entries(json)
    .map(([id, stop]) => ({
      id,
      name: stop.stop_name,
      lat: stop.lat,
      lon: stop.lon,
      routes: (stop.routes ?? []).filter((route) => TRAM_LINE_SET.has(route)),
      isTerminal: Boolean(stop.is_terminal),
    }))
    .filter((stop) => stop.routes.length > 0);
  setCached("stops", stops, 30 * 60 * 1000);
  return stops;
}

function parseTimes(raw: unknown): Arrival["times"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "string") return null;
      const [clock, minutes] = item.split("|");
      if (!clock) return null;
      return { clock, minutes: Number(minutes) || 0 };
    })
    .filter((item): item is Arrival["times"][number] => item !== null);
}

export async function fetchArrivals(stopId: string): Promise<Arrival[]> {
  const key = `arrivals:${stopId}`;
  const cached = getCached<Arrival[]>(key);
  try {
    const res = await stptFetch(`/proxy-smtt-cache.php?stopid=${encodeURIComponent(stopId)}`);
    const json = (await res.json()) as Array<{
      route: string;
      type: string;
      destination: string;
      vehicleId: string | null;
      times: unknown;
    }>;
    const arrivals = json
      .filter((row) => TRAM_LINE_SET.has(row.route) || row.type === "tv")
      .map((row) => ({
        route: row.route,
        type: row.type,
        destination: row.destination,
        vehicleId: row.vehicleId,
        times: parseTimes(row.times),
      }));
    setCached(key, arrivals, 8000);
    return arrivals;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

function extractRoutes(entity: unknown): string[] {
  if (!Array.isArray(entity)) return [];
  const routes: string[] = [];
  for (const item of entity) {
    if (!item || typeof item !== "object") continue;
    const routeId = (item as { routeId?: string }).routeId;
    if (typeof routeId === "string" && routeId.startsWith("R_TV_")) {
      routes.push(routeId.replace("R_TV_", ""));
    }
  }
  return [...new Set(routes)];
}

export async function fetchAlerts(): Promise<Alert[]> {
  const cached = getCached<Alert[]>("alerts");
  if (cached) return cached;
  const res = await stptFetch("/proxy-alerts.php");
  const json = (await res.json()) as {
    alerts?: Array<{
      id: string;
      headerText?: string;
      descriptionText?: string;
      cause?: string;
      effect?: string;
      informedEntity?: unknown;
    }>;
  };
  const alerts = (json.alerts ?? []).map((alert) => ({
    id: alert.id,
    header: alert.headerText ?? "",
    description: alert.descriptionText ?? "",
    cause: alert.cause ?? "",
    effect: alert.effect ?? "",
    routes: extractRoutes(alert.informedEntity),
  }));
  setCached("alerts", alerts, 60 * 1000);
  return alerts;
}

export async function fetchRoute(id: string, direction: "tur" | "retur"): Promise<RouteDetail> {
  const key = `route:${id}:${direction}`;
  const cached = getCached<RouteDetail>(key);
  if (cached) return cached;
  const res = await stptFetch(
    `/api/transport-core.php?route=${encodeURIComponent(id)}&direction=${encodeURIComponent(direction)}`,
  );
  const json = (await res.json()) as {
    route?: { route_short_name?: string; route_long_name?: string; route_color?: string };
    resolved?: { headsign?: string; geojson?: string };
    stops?: Array<{
      stop_id: string;
      sequence: number;
      stop_name: string;
      lat: number;
      lon: number;
      is_terminal?: boolean;
    }>;
  };
  const detail: RouteDetail = {
    id,
    shortName: json.route?.route_short_name ?? id,
    longName: json.route?.route_long_name ?? "",
    color: json.route?.route_color ?? "e3a900",
    headsign: json.resolved?.headsign ?? "",
    direction,
    geojson: json.resolved?.geojson ?? "",
    stops: (json.stops ?? []).map((stop) => ({
      stopId: String(stop.stop_id),
      sequence: stop.sequence,
      stopName: stop.stop_name,
      lat: stop.lat,
      lon: stop.lon,
      isTerminal: Boolean(stop.is_terminal),
    })),
  };
  setCached(key, detail, 10 * 60 * 1000);
  return detail;
}

export async function fetchNetwork(): Promise<GeoJsonFeatureCollection> {
  const cached = getCached<GeoJsonFeatureCollection>("network");
  if (cached) return cached;
  const features: GeoJsonFeatureCollection["features"] = [];
  await Promise.all(
    TRAM_LINES.map(async (line) => {
      try {
        const res = await stptFetch(`/routes-generated/${line.id}-t.geojson`, 12000);
        const geo = (await res.json()) as GeoJsonFeatureCollection;
        for (const feature of geo.features ?? []) {
          feature.properties = {
            ...(feature.properties ?? {}),
            lineId: line.id,
          };
          features.push(feature);
        }
      } catch {
        // skip a missing shape
      }
    }),
  );
  const collection: GeoJsonFeatureCollection = { type: "FeatureCollection", features };
  setCached("network", collection, 60 * 60 * 1000);
  return collection;
}
