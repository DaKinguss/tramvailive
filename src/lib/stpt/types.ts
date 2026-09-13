export const TRAM_LINE_IDS = ["1", "2", "4", "7", "8", "9"] as const;
export type TramLineId = (typeof TRAM_LINE_IDS)[number];

export const TRAM_LINE_SET = new Set<string>(TRAM_LINE_IDS);

export type Vehicle = {
  id: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  route: string;
  directionId: string;
  headsign: string;
  stop: string;
  timestamp: number;
  isAccessible: boolean;
  routeId: string;
  tripId: string;
  shapeId: string;
};

export type VehiclesPayload = {
  vehicles: Vehicle[];
  total: number;
  generatedAt: number;
  ageSeconds: number;
  isStale: boolean;
  liveStatus: string;
  liveStatusReason: string | null;
};

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes: string[];
  isTerminal: boolean;
};

export type ArrivalTime = {
  clock: string;
  minutes: number;
};

export type Arrival = {
  route: string;
  type: string;
  destination: string;
  vehicleId: string | null;
  times: ArrivalTime[];
};

export type Alert = {
  id: string;
  header: string;
  description: string;
  cause: string;
  effect: string;
  routes: string[];
};

export type RouteStop = {
  stopId: string;
  sequence: number;
  stopName: string;
  lat: number;
  lon: number;
  isTerminal: boolean;
};

export type RouteDetail = {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  headsign: string;
  direction: "tur" | "retur";
  geojson: string;
  stops: RouteStop[];
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties?: Record<string, unknown> | null;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  }>;
};
