import { TriangleAlert } from "lucide-react";
import { TramBadge } from "@/components/tram-badge";
import { dictionary } from "@/lib/i18n";
import type { Alert } from "@/lib/stpt/types";
import { useAppStore } from "@/lib/store";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];
  const setSelectedLine = useAppStore((s) => s.setSelectedLine);
  const setTab = useAppStore((s) => s.setTab);

  const tramAlerts = alerts.filter(
    (alert) =>
      alert.routes.length > 0 ||
      /tramvai|tv |linia 1|linia 2|linia 4|linia 5|linia 7|linia 8|linia 9/i.test(
        `${alert.header} ${alert.description}`,
      ),
  );
  const shown = tramAlerts.length > 0 ? tramAlerts : alerts;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-4 pt-2">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t.alerts}</h1>
        <p className="mt-1 text-sm text-muted">{t.source}</p>
      </header>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t.emptyAlerts}</p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((alert) => (
            <li key={alert.id} className="rounded-2xl bg-surface p-4">
              <div className="mb-2 flex items-center gap-2 text-warn">
                <TriangleAlert className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {alert.effect === "DETOUR" ? t.detour : t.construction}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-fg">{alert.header}</p>
              {alert.routes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {alert.routes.map((route) => (
                    <button
                      key={route}
                      type="button"
                      onClick={() => {
                        setSelectedLine(route);
                        setTab("map");
                      }}
                    >
                      <TramBadge line={route} size="sm" />
                    </button>
                  ))}
                </div>
              ) : null}
              {alert.description && alert.description !== alert.header ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {alert.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
