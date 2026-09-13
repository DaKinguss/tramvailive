import { Heart } from "lucide-react";
import { TramBadge } from "@/components/tram-badge";
import { dictionary } from "@/lib/i18n";
import { TRAM_LINES } from "@/lib/stpt/lines";
import { useAppStore } from "@/lib/store";

export function LinesPanel({ counts }: { counts: Record<string, number> }) {
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];
  const selectedLine = useAppStore((s) => s.selectedLine);
  const setSelectedLine = useAppStore((s) => s.setSelectedLine);
  const setTab = useAppStore((s) => s.setTab);
  const favoriteLines = useAppStore((s) => s.favoriteLines);
  const toggleFavoriteLine = useAppStore((s) => s.toggleFavoriteLine);

  const ordered = [...TRAM_LINES].sort((a, b) => {
    const af = favoriteLines.includes(a.id) ? 0 : 1;
    const bf = favoriteLines.includes(b.id) ? 0 : 1;
    return af - bf;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-4 pt-2">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t.lines}</h1>
        <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
      </header>
      <ul className="grid gap-2">
        {ordered.map((line) => {
          const count = counts[line.id] ?? 0;
          const fav = favoriteLines.includes(line.id);
          const active = selectedLine === line.id;
          return (
            <li key={line.id}>
              <div
                className={`flex items-center gap-3 rounded-2xl p-3 ${active ? "bg-surface-2" : "bg-surface"}`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    setSelectedLine(line.id);
                    setTab("map");
                  }}
                >
                  <TramBadge line={line.id} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight">{t.lineN(line.id)}</p>
                    <p className="truncate text-sm text-muted">{line.longName}</p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {count} {count === 1 ? t.vehicle : t.vehicles}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="grid size-11 place-items-center rounded-full text-muted"
                  onClick={() => toggleFavoriteLine(line.id)}
                  aria-label={fav ? t.removeFavorite : t.addFavorite}
                >
                  <Heart className="size-5" fill={fav ? "currentColor" : "none"} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
