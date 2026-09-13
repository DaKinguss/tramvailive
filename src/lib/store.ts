import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "./i18n";
import type { Stop, Vehicle } from "./stpt/types";

export type TabId = "map" | "lines" | "nearby" | "alerts";

type Selection =
  | { kind: "none" }
  | { kind: "vehicle"; vehicle: Vehicle }
  | { kind: "stop"; stop: Stop };

type AppState = {
  lang: Lang;
  tab: TabId;
  selectedLine: string | null;
  selection: Selection;
  followVehicleId: string | null;
  favoriteStops: string[];
  favoriteLines: string[];
  setLang: (lang: Lang) => void;
  setTab: (tab: TabId) => void;
  setSelectedLine: (id: string | null) => void;
  setSelection: (selection: Selection) => void;
  setFollowVehicleId: (id: string | null) => void;
  toggleFavoriteStop: (id: string) => void;
  toggleFavoriteLine: (id: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      lang: "ro",
      tab: "map",
      selectedLine: null,
      selection: { kind: "none" },
      followVehicleId: null,
      favoriteStops: [],
      favoriteLines: [],
      setLang: (lang) => set({ lang }),
      setTab: (tab) => set({ tab, selection: { kind: "none" } }),
      setSelectedLine: (id) => set({ selectedLine: id }),
      setSelection: (selection) => set({ selection }),
      setFollowVehicleId: (id) => set({ followVehicleId: id }),
      toggleFavoriteStop: (id) => {
        const current = get().favoriteStops;
        set({
          favoriteStops: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        });
      },
      toggleFavoriteLine: (id) => {
        const current = get().favoriteLines;
        set({
          favoriteLines: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        });
      },
    }),
    {
      name: "tram-tm",
      partialize: (state) => ({
        lang: state.lang,
        favoriteStops: state.favoriteStops,
        favoriteLines: state.favoriteLines,
      }),
    },
  ),
);
