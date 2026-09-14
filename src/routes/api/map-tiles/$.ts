import { createFileRoute } from "@tanstack/react-router";
import { cartoDarkTileUrl, cartoLightTileUrl } from "@/lib/stpt/carto.server";

export const Route = createFileRoute("/api/map-tiles/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const theme = new URL(request.url).searchParams.get("theme") === "light" ? "light" : "dark";
        const splat = (params._splat ?? "").replace(/\.png$/, "");
        const parts = splat.split("/");
        if (parts.length !== 3) {
          return new Response("Bad tile", { status: 400 });
        }
        const z = Number(parts[0]);
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        if (![z, x, y].every((n) => Number.isInteger(n) && n >= 0) || z > 19) {
          return new Response("Bad tile", { status: 400 });
        }

        const sources =
          theme === "light"
            ? [
                cartoLightTileUrl(z, x, y),
                `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
              ]
            : [
                cartoDarkTileUrl(z, x, y),
                `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
              ];

        for (const url of sources) {
          try {
            const res = await fetch(url, {
              headers: { Accept: "image/png,image/jpeg,*/*", "User-Agent": "TramTM/1.0" },
            });
            if (!res.ok) continue;
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 200) continue;
            const type = res.headers.get("content-type") || "image/png";
            return new Response(buf, {
              headers: {
                "Content-Type": type.includes("image/") ? type : "image/png",
                "Cache-Control": "public, max-age=3600",
              },
            });
          } catch {
            // try next source
          }
        }

        return new Response("Tile unavailable", { status: 502 });
      },
    },
  },
});
