import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dictionary } from "@/lib/i18n";
import { haversineMeters, lerp, lerpAngle, smoothstep } from "@/lib/stpt/geo";
import { CNB, LANDMARK_META, landmarkAnchors, splitLandmarkStops } from "@/lib/stpt/landmarks";
import { TM_CENTER, TM_DEFAULT_ZOOM } from "@/lib/stpt/lines";
import type { GeoJsonFeatureCollection, Stop, Vehicle } from "@/lib/stpt/types";
import { useAppStore } from "@/lib/store";

const STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: ["/api/map-tiles/{z}/{x}/{y}?v=2"],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "basemap", type: "raster" as const, source: "basemap" }],
};

type MapLibre = typeof import("maplibre-gl");
type MapInstance = InstanceType<MapLibre["Map"]>;
type MarkerInstance = InstanceType<MapLibre["Marker"]>;

type Track = {
  from: { lat: number; lng: number; bearing: number };
  to: { lat: number; lng: number; bearing: number };
  started: number;
  duration: number;
  vehicle: Vehicle;
};

function createMarkerEl(vehicle: Vehicle) {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "tram-marker";
  wrap.setAttribute("aria-label", `Tram ${vehicle.route}`);
  wrap.innerHTML = `<span class="tram-marker-inner"><span class="tram-marker-chevron"></span>${vehicle.route}</span>`;
  return wrap;
}

function createPlaceLabel(text: string, color: string, ink: string, title: string) {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "place-label";
  wrap.style.setProperty("--place", color);
  wrap.style.setProperty("--place-ink", ink);
  wrap.setAttribute("aria-label", title);
  wrap.innerHTML = `<span class="place-label-badge">${text}</span><span class="place-label-pin"></span>`;
  return wrap;
}

function stopFromFeature(feature: { geometry: { type: string; coordinates?: number[] }; properties?: Record<string, unknown> }): Stop | null {
  if (feature.geometry.type !== "Point" || !feature.geometry.coordinates) return null;
  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties ?? {};
  return {
    id: String(props.id),
    name: String(props.name),
    lat,
    lon: lng,
    routes: String(props.routes ?? "")
      .split(",")
      .filter(Boolean),
    isTerminal: props.isTerminal === true || props.isTerminal === "true",
  };
}

export function LiveMap({
  vehicles,
  stops,
  network,
  userLocation,
  onLocate,
}: {
  vehicles: Vehicle[];
  stops: Stop[];
  network: GeoJsonFeatureCollection | undefined;
  userLocation: { lat: number; lng: number } | null;
  onLocate: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<Map<string, { marker: MarkerInstance; el: HTMLButtonElement }>>(new Map());
  const tracksRef = useRef<Map<string, Track>>(new Map());
  const userMarkerRef = useRef<MarkerInstance | null>(null);
  const placeMarkersRef = useRef<MarkerInstance[]>([]);
  const selectedLine = useAppStore((s) => s.selectedLine);
  const followVehicleId = useAppStore((s) => s.followVehicleId);
  const setSelection = useAppStore((s) => s.setSelection);
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];

  useEffect(() => {
    let cancelled = false;
    let map: MapInstance | null = null;

    async function boot() {
      const mod = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      libRef.current = mod;
      map = new mod.Map({
        container: containerRef.current,
        style: STYLE,
        center: [TM_CENTER.lng, TM_CENTER.lat],
        zoom: TM_DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.on("load", () => {
        if (!map) return;
        map.resize();
        setMapReady(true);
        map.addSource("tram-network", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "tram-network-glow",
          type: "line",
          source: "tram-network",
          paint: {
            "line-color": "#e3a900",
            "line-width": 6,
            "line-opacity": 0.16,
          },
        });
        map.addLayer({
          id: "tram-network-line",
          type: "line",
          source: "tram-network",
          paint: {
            "line-color": "#e3a900",
            "line-width": 2.2,
            "line-opacity": 0.78,
          },
        });
        map.addSource("tram-stops", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "tram-stops-layer",
          type: "circle",
          source: "tram-stops",
          minzoom: 13.4,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2.2, 16, 4.5],
            "circle-color": "#f2f0ea",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#090a0c",
            "circle-opacity": 0.9,
          },
        });

        const onStopClick = (event: { features?: Array<{ geometry: { type: string; coordinates?: number[] }; properties?: Record<string, unknown> }> }) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const stop = stopFromFeature(feature);
          if (stop) setSelection({ kind: "stop", stop });
        };
        map.on("click", "tram-stops-layer", onStopClick);
        map.on("mouseenter", "tram-stops-layer", () => {
          map!.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "tram-stops-layer", () => {
          map!.getCanvas().style.cursor = "";
        });
      });
    }

    void boot();
    return () => {
      cancelled = true;
      setMapReady(false);
      map?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      placeMarkersRef.current = [];
    };
  }, [setSelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !network) return;
    const apply = () => {
      const source = map.getSource("tram-network") as { setData: (data: unknown) => void } | undefined;
      const features = selectedLine
        ? network.features.filter((f) => f.properties?.lineId === selectedLine)
        : network.features;
      console.log("[DEBUG tram-network]", {
        sourceFound: Boolean(source),
        selectedLine,
        totalNetworkFeatures: network.features.length,
        filteredFeatures: features.length,
        sampleCoords: features[0]?.geometry?.coordinates?.[0],
      });
      if (!source) return;
      source.setData({ type: "FeatureCollection", features });
    };
    apply();
  }, [network, selectedLine, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const apply = () => {
      const stopSource = map.getSource("tram-stops") as { setData: (data: unknown) => void } | undefined;
      if (!stopSource) return;
      const { rest } = splitLandmarkStops(stops);
      const visibleRest = selectedLine ? rest.filter((s) => s.routes.includes(selectedLine)) : rest;
      stopSource.setData({
        type: "FeatureCollection",
        features: visibleRest.map((stop) => ({
          type: "Feature",
          properties: {
            id: stop.id,
            name: stop.name,
            routes: stop.routes.join(","),
            isTerminal: stop.isTerminal,
          },
          geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
        })),
      });
    };
    apply();
  }, [stops, selectedLine, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !mapReady) return;
    const visible = selectedLine ? vehicles.filter((v) => v.route === selectedLine) : vehicles;
    const now = performance.now();
    const nextIds = new Set(visible.map((v) => v.id));

    for (const [id, entry] of markersRef.current) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
        tracksRef.current.delete(id);
      }
    }

    for (const vehicle of visible) {
      const existing = markersRef.current.get(vehicle.id);
      const prevTrack = tracksRef.current.get(vehicle.id);
      const from = prevTrack
        ? {
            lat: lerp(prevTrack.from.lat, prevTrack.to.lat, 1),
            lng: lerp(prevTrack.from.lng, prevTrack.to.lng, 1),
            bearing: prevTrack.to.bearing,
          }
        : { lat: vehicle.lat, lng: vehicle.lng, bearing: vehicle.bearing };
      const jump = haversineMeters(from.lat, from.lng, vehicle.lat, vehicle.lng);
      tracksRef.current.set(vehicle.id, {
        from: jump > 700 ? { lat: vehicle.lat, lng: vehicle.lng, bearing: vehicle.bearing } : from,
        to: { lat: vehicle.lat, lng: vehicle.lng, bearing: vehicle.bearing },
        started: now,
        duration: 8000,
        vehicle,
      });

      if (!existing) {
        const el = createMarkerEl(vehicle);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          const latest = tracksRef.current.get(vehicle.id)?.vehicle ?? vehicle;
          setSelection({ kind: "vehicle", vehicle: latest });
        });
        const marker = new lib.Marker({ element: el, anchor: "center", rotationAlignment: "map" })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setRotation(vehicle.bearing)
          .addTo(map);
        markersRef.current.set(vehicle.id, { marker, el });
      }
    }
  }, [vehicles, selectedLine, setSelection, mapReady]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      for (const [id, track] of tracksRef.current) {
        const entry = markersRef.current.get(id);
        if (!entry) continue;
        const tNorm = smoothstep((now - track.started) / track.duration);
        const lat = lerp(track.from.lat, track.to.lat, tNorm);
        const lng = lerp(track.from.lng, track.to.lng, tNorm);
        const bearing = lerpAngle(track.from.bearing, track.to.bearing, tNorm);
        entry.marker.setLngLat([lng, lat]);
        entry.marker.setRotation(bearing);
        if (followVehicleId === id && mapRef.current) {
          mapRef.current.setCenter([lng, lat]);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [followVehicleId]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !mapReady) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "size-4 rounded-full bg-live shadow-[0_0_0_6px_rgb(61_220_151_/_28%)]";
      userMarkerRef.current = new lib.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !mapReady) return;
    for (const marker of placeMarkersRef.current) marker.remove();
    placeMarkersRef.current = [];

    const anchors = landmarkAnchors(stops);
    for (const place of anchors) {
      const el = createPlaceLabel(place.mapLabel, place.color, place.ink, place.labelRo);
      if (place.stop) {
        const stop = place.stop;
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelection({ kind: "stop", stop });
        });
      }
      const marker = new lib.Marker({ element: el, anchor: "bottom" })
        .setLngLat([place.lon, place.lat])
        .addTo(map);
      placeMarkersRef.current.push(marker);
    }

    const cnbEl = createPlaceLabel(CNB.label, CNB.color, CNB.ink, t.landmarkCnbFull);
    const cnbMarker = new lib.Marker({ element: cnbEl, anchor: "bottom" })
      .setLngLat([CNB.lng, CNB.lat])
      .addTo(map);
    placeMarkersRef.current.push(cnbMarker);

    return () => {
      for (const marker of placeMarkersRef.current) marker.remove();
      placeMarkersRef.current = [];
    };
  }, [mapReady, stops, setSelection, t.landmarkCnbFull]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !mapReady || !selectedLine || vehicles.length === 0) return;
    const ofLine = vehicles.filter((v) => v.route === selectedLine);
    if (ofLine.length === 0) return;
    const bounds = new lib.LngLatBounds();
    ofLine.forEach((v) => bounds.extend([v.lng, v.lat]));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 72, maxZoom: 14.5, duration: 600 });
    }
  }, [selectedLine, vehicles, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-bg" />
      <button
        type="button"
        onClick={onLocate}
        className="absolute right-3 top-[7.5rem] z-10 grid size-11 place-items-center rounded-full ios-blur text-fg shadow-panel"
        aria-label={t.locate}
      >
        <LocateFixed className="size-5" />
      </button>
      <div className="absolute bottom-3 left-3 z-10 rounded-2xl ios-blur px-3 py-2.5 shadow-panel">
        <ul className="space-y-1.5 text-[11px] font-semibold tracking-wide text-fg">
          <li className="flex items-center gap-2">
            <span className="rounded px-1 py-0.5 text-[9px] font-extrabold tracking-[0.04em] text-bg" style={{ background: LANDMARK_META.basarab.color, color: LANDMARK_META.basarab.ink }}>MB</span>
            {t.landmarkBasarab}
          </li>
          <li className="flex items-center gap-2">
            <span className="rounded px-1 py-0.5 text-[9px] font-extrabold tracking-[0.04em]" style={{ background: LANDMARK_META.mocioni.color, color: LANDMARK_META.mocioni.ink }}>P.Mocioni</span>
            {t.landmarkMocioni}
          </li>
          <li className="flex items-center gap-2">
            <span className="rounded px-1 py-0.5 text-[9px] font-extrabold tracking-[0.04em]" style={{ background: LANDMARK_META.maria.color, color: LANDMARK_META.maria.ink }}>P.Maria</span>
            {t.landmarkMaria}
          </li>
          <li className="flex items-center gap-2">
            <span className="rounded bg-fg px-1 py-0.5 text-[9px] font-extrabold tracking-[0.08em] text-bg">CNB</span>
            {t.landmarkCnbFull}
          </li>
        </ul>
      </div>
    </div>
  );
}
