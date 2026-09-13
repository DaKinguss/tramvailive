import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { AlertsPanel } from "@/components/alerts-panel";
import { DetailSheet } from "@/components/detail-sheet";
import { LineChips } from "@/components/line-chips";
import { LinesPanel } from "@/components/lines-panel";
import { LiveMap } from "@/components/live-map";
import { NearbyPanel } from "@/components/nearby-panel";
import { TabBar } from "@/components/tab-bar";
import { dictionary } from "@/lib/i18n";
import { api } from "@/lib/query";
import { useAppStore } from "@/lib/store";

export function AppShell() {
  const tab = useAppStore((s) => s.tab);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const t = dictionary[lang];
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: api.vehicles,
    refetchInterval: 8000,
  });
  const stopsQuery = useQuery({
    queryKey: ["stops"],
    queryFn: api.stops,
    staleTime: 10 * 60 * 1000,
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: api.alerts,
    staleTime: 60 * 1000,
  });
  const networkQuery = useQuery({
    queryKey: ["network"],
    queryFn: api.network,
    staleTime: 30 * 60 * 1000,
  });

  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const vehicle of vehicles) {
      next[vehicle.route] = (next[vehicle.route] ?? 0) + 1;
    }
    return next;
  }, [vehicles]);

  const onLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  }, []);

  const stale = Boolean(vehiclesQuery.data?.isStale);
  const error = vehiclesQuery.isError;

  return (
    <div className="relative flex h-dvh flex-col bg-bg text-fg">
      <div className="relative min-h-0 flex-1">
        <LiveMap
          vehicles={vehicles}
          stops={stopsQuery.data ?? []}
          network={networkQuery.data}
          userLocation={userLocation}
          onLocate={onLocate}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <div className="pointer-events-auto ios-blur sheet-shadow rounded-[22px] p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="live-dot" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {t.live}
                  </p>
                </div>
                <h1 className="text-xl font-semibold tracking-tight">{t.app}</h1>
              </div>
              <button
                type="button"
                onClick={() => setLang(lang === "ro" ? "en" : "ro")}
                className="h-9 rounded-full bg-surface-2 px-3 text-xs font-semibold tracking-wide text-fg"
              >
                {t.languageToggle}
              </button>
            </div>
            <p className="mb-2.5 text-sm text-muted">
              {error ? t.offline : stale ? t.stalled : t.tramsLive(vehicles.length)}
            </p>
            <LineChips counts={counts} />
          </div>
        </div>

        {tab === "map" ? <DetailSheet /> : null}

        {tab !== "map" ? (
          <div className="absolute inset-0 z-30 bg-bg pt-[max(12px,env(safe-area-inset-top))]">
            {tab === "lines" ? <LinesPanel counts={counts} /> : null}
            {tab === "nearby" ? (
              <NearbyPanel
                stops={stopsQuery.data ?? []}
                userLocation={userLocation}
                onLocate={onLocate}
              />
            ) : null}
            {tab === "alerts" ? <AlertsPanel alerts={alertsQuery.data ?? []} /> : null}
          </div>
        ) : null}
      </div>
      <TabBar />
    </div>
  );
}
