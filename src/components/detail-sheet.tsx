import { useQuery } from "@tanstack/react-query";
import { Accessibility, Clock, Heart, Navigation, X } from "lucide-react";
import { TramBadge } from "@/components/tram-badge";
import { dictionary } from "@/lib/i18n";
import { api } from "@/lib/query";
import { LINE_BY_ID } from "@/lib/stpt/lines";
import type { TramLineId } from "@/lib/stpt/types";
import { useAppStore } from "@/lib/store";

function minutesLabel(mins: number, now: string, unit: string) {
  if (mins <= 0) return now;
  return `${mins} ${unit}`;
}

export function DetailSheet() {
  const selection = useAppStore((s) => s.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const followVehicleId = useAppStore((s) => s.followVehicleId);
  const setFollowVehicleId = useAppStore((s) => s.setFollowVehicleId);
  const favoriteStops = useAppStore((s) => s.favoriteStops);
  const toggleFavoriteStop = useAppStore((s) => s.toggleFavoriteStop);
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];

  const stopId = selection.kind === "stop" ? selection.stop.id : "";
  const arrivalsQuery = useQuery({
    queryKey: ["arrivals", stopId],
    queryFn: () => api.arrivals(stopId),
    enabled: selection.kind === "stop",
    refetchInterval: 12000,
  });

  if (selection.kind === "none") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.6rem] z-20 px-3">
      <section className="pointer-events-auto ios-blur sheet-shadow max-h-[46vh] overflow-y-auto rounded-[22px] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          {selection.kind === "vehicle" ? (
            <div className="flex min-w-0 items-center gap-3">
              <TramBadge line={selection.vehicle.route} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  {t.towards}
                </p>
                <h2 className="truncate text-lg font-semibold leading-snug tracking-tight">
                  {selection.vehicle.headsign}
                </h2>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {t.arrivals}
              </p>
              <h2 className="text-lg font-semibold leading-snug tracking-tight">
                {selection.stop.name}
              </h2>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSelection({ kind: "none" });
              setFollowVehicleId(null);
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {selection.kind === "vehicle" ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                <p className="text-xs text-muted">{t.nextStop}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{selection.vehicle.stop}</p>
              </div>
              <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                <p className="text-xs text-muted">{t.speed}</p>
                <p className="mt-0.5 text-sm font-medium tabular-nums">
                  {Math.round(selection.vehicle.speed)} {t.kmh}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="tabular-nums">
                {t.vehicleId} {selection.vehicle.id}
              </span>
              {selection.vehicle.isAccessible ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-live/15 px-2 py-0.5 text-live">
                  <Accessibility className="size-3.5" />
                  {t.accessible}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() =>
                setFollowVehicleId(
                  followVehicleId === selection.vehicle.id ? null : selection.vehicle.id,
                )
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-fg"
            >
              <Navigation className="size-4" />
              {followVehicleId === selection.vehicle.id ? t.unfollow : t.follow}
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-1.5">
              {selection.stop.routes.map((route) => (
                <TramBadge key={route} line={route} size="sm" />
              ))}
            </div>
            {arrivalsQuery.isLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
            ) : arrivalsQuery.data && arrivalsQuery.data.length > 0 ? (
              <ul className="grid gap-1.5">
                {arrivalsQuery.data.map((arrival, index) => (
                  <li
                    key={`${arrival.route}-${arrival.destination}-${index}`}
                    className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
                  >
                    <TramBadge line={arrival.route} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{arrival.destination}</p>
                      <p className="text-xs text-muted">
                        {LINE_BY_ID[arrival.route as TramLineId]?.longName ?? t.lineN(arrival.route)}
                      </p>
                    </div>
                    <div className="text-right">
                      {arrival.times.slice(0, 2).map((time) => (
                        <p key={time.clock} className="text-sm font-semibold tabular-nums">
                          {minutesLabel(time.minutes, t.now, t.min)}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Clock className="size-4" />
                {t.emptyArrivals}
              </p>
            )}
            <button
              type="button"
              onClick={() => toggleFavoriteStop(selection.stop.id)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold"
            >
              <Heart
                className="size-4"
                fill={favoriteStops.includes(selection.stop.id) ? "currentColor" : "none"}
              />
              {favoriteStops.includes(selection.stop.id) ? t.removeFavorite : t.addFavorite}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
