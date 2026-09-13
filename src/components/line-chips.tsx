import { cn } from "@/lib/cn";
import { dictionary } from "@/lib/i18n";
import { TRAM_LINES } from "@/lib/stpt/lines";
import { useAppStore } from "@/lib/store";

export function LineChips({ counts }: { counts: Record<string, number> }) {
  const selected = useAppStore((s) => s.selectedLine);
  const setSelected = useAppStore((s) => s.setSelectedLine);
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className={cn(
          "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
          selected === null
            ? "bg-accent text-accent-fg"
            : "bg-surface-2 text-fg",
        )}
      >
        {t.allLines}
      </button>
      {TRAM_LINES.map((line) => {
        const active = selected === line.id;
        const count = counts[line.id] ?? 0;
        return (
          <button
            key={line.id}
            type="button"
            onClick={() => setSelected(active ? null : line.id)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-sm font-medium transition-colors duration-150",
              active ? "bg-tram text-tram-fg" : "bg-surface-2 text-fg",
            )}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                active ? "bg-tram-fg/15" : "bg-tram text-tram-fg",
              )}
            >
              {line.id}
            </span>
            <span className="tabular-nums text-xs opacity-80">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
