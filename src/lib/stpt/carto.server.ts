import { env } from "@/lib/env.server";

const CARTO_API_KEY = env("CARTO_API_KEY") ?? "cb1_3fk0_1_c40c96719d53939eb11470e0";

export function cartoDarkTileUrl(z: number, x: number, y: number): string {
  const key = encodeURIComponent(CARTO_API_KEY);
  return `https://basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}@2x.png?key=${key}`;
}

export function cartoLightTileUrl(z: number, x: number, y: number): string {
  const key = encodeURIComponent(CARTO_API_KEY);
  return `https://basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}@2x.png?key=${key}`;
}
