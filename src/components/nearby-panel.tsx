import { Heart, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { TramBadge } from "@/components/tram-badge";
import { dictionary } from "@/lib/i18n";
import { formatDistance, haversineMeters } from "@/lib/stpt/geo";
import { TM_CENTER } from "@/lib/stpt/lines";
import type { Stop } from "@/lib/stpt/types";
import { useAppStore } from "@/lib/store";

function NearbyRow({
  stop,
  meters,
  onOpen,
}: {
  stop: Stop;
  meters: number;
  onOpen: () => void;
}) {
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];
  const favoriteStops = useAppStore((s) => s.favoriteStops);
  const toggleFavoriteStop = useAppStore((s) => s.toggleFavoriteStop);

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface p-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="grid size-11 place-items-center rounded-xl bg-surface-2 text-muted">
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{stop.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {stop.routes.map((route) => (
              <TramBadge key={route} line={route} size="sm" />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{formatDistance(meters, lang)}</p>
        </div>
      </button>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-muted"
        onClick={() => toggleFavoriteStop(stop.id)}
        aria-label={favoriteStops.includes(stop.id) ? t.removeFavorite : t.addFavorite}
      >
        <Heart className="size-5" fill={favoriteStops.includes(stop.id) ? "currentColor" : "none"} />
      </button>
    </li>
  );
}

export function NearbyPanel({
  stops,
  userLocation,
  onLocate,
}: {
  stops: Stop[];
  userLocation: { lat: number; lng: number } | null;
  onLocate: () => void;
}) {
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];
  const setSelection = useAppStore((s) => s.setSelection);
  const setTab = useAppStore((s) => s.setTab);
  const favoriteStops = useAppStore((s) => s.favoriteStops);
  const [q, setQ] = useState("");
  const origin = userLocation ?? TM_CENTER;

  const ranked = useMemo(() => {
    const query = q.trim().toLowerCase();
    return stops
      .map((stop) => ({
        stop,
        meters: haversineMeters(origin.lat, origin.lng, stop.lat, stop.lon),
      }))
      .filter(({ stop }) => {
        if (!query) return true;
        return (
          stop.name.toLowerCase().includes(query) ||
          stop.routes.some((route) => route.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const af = favoriteStops.includes(a.stop.id) ? 0 : 1;
        const bf = favoriteStops.includes(b.stop.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        return a.meters - b.meters;
      })
      .slice(0, 24);
  }, [stops, origin.lat, origin.lng, q, favoriteStops]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-4 pt-2">
      <header className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.nearby}</h1>
        <p className="mt-1 text-sm text-muted">
          {userLocation ? t.walking(Math.max(1, Math.round((ranked[0]?.meters ?? 0) / 80))) : t.noLocation}
        </p>
      </header>
      <input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder={t.searchStops}
        className="mb-3 h-11 rounded-xl bg-surface px-3 text-sm text-fg outline-none placeholder:text-subtle"
      />
      {!userLocation ? (
        <button
          type="button"
          onClick={onLocate}
          className="mb-3 flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
        >
          {t.enableLocation}
        </button>
      ) : null}
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">{t.emptyNearby}</p>
      ) : (
        <ul className="grid gap-2">
          {ranked.map(({ stop, meters }) => (
            <NearbyRow
              key={stop.id}
              stop={stop}
              meters={meters}
              onOpen={() => {
                setSelection({ kind: "stop", stop });
                setTab("map");
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
