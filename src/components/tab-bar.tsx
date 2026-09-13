import { Bell, Map, Rows3, TrainFront } from "lucide-react";
import { dictionary } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useAppStore, type TabId } from "@/lib/store";

const TABS: { id: TabId; icon: typeof Map }[] = [
  { id: "map", icon: Map },
  { id: "lines", icon: TrainFront },
  { id: "nearby", icon: Rows3 },
  { id: "alerts", icon: Bell },
];

export function TabBar() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const lang = useAppStore((s) => s.lang);
  const t = dictionary[lang];

  return (
    <nav
      className="ios-blur grid grid-cols-4 border-t border-border px-2 pt-1"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      aria-label="Tabs"
    >
      {TABS.map(({ id, icon: Icon }) => {
        const active = tab === id;
        const label = t[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150",
              active ? "text-fg" : "text-muted",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn("size-5", active ? "stroke-[2.2]" : "stroke-[1.7]")}
              aria-hidden
            />
            <span className="text-[11px] font-medium tracking-wide">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
