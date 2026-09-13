import { createFileRoute } from "@tanstack/react-router";
import {
  fetchAlerts,
  fetchArrivals,
  fetchNetwork,
  fetchRoute,
  fetchStops,
  fetchVehicles,
} from "@/lib/stpt/client.server";

function json(data: unknown, status = 200, maxAge = 5) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`,
    },
  });
}

export const Route = createFileRoute("/api/stpt/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = params._splat ?? "";
        const url = new URL(request.url);
        try {
          if (path === "vehicles") return json(await fetchVehicles(), 200, 4);
          if (path === "stops") return json(await fetchStops(), 200, 300);
          if (path === "alerts") return json(await fetchAlerts(), 200, 30);
          if (path === "network") return json(await fetchNetwork(), 200, 600);
          if (path === "arrivals") {
            const stopId = url.searchParams.get("stopId") ?? "";
            if (!stopId) return json({ error: "stopId required" }, 400, 0);
            return json(await fetchArrivals(stopId), 200, 5);
          }
          if (path === "route") {
            const id = url.searchParams.get("id") ?? "";
            const dir = url.searchParams.get("dir") === "retur" ? "retur" : "tur";
            if (!id) return json({ error: "id required" }, 400, 0);
            return json(await fetchRoute(id, dir), 200, 120);
          }
          return json({ error: "not found" }, 404, 0);
        } catch (error) {
          const message = error instanceof Error ? error.message : "upstream failed";
          return json({ error: message }, 502, 0);
        }
      },
    },
  },
});
