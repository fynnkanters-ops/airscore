import type { NextConfig } from "next";

// Repo-Name auf GitHub Pages → bestimmt den URL-Unterpfad.
// Liegt die App unter https://<user>.github.io/airscore/, ist basePath '/airscore'.
// Heißt dein Repo anders, hier (oder via NEXT_PUBLIC_BASE_PATH) anpassen.
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/airscore";

const nextConfig: NextConfig = {
  // Statischer Export → läuft ohne Server (GitHub Pages), kein API-Key nötig.
  output: "export",
  // basePath/assetPrefix nur im Production-Build; lokal (npm run dev) ohne Präfix.
  basePath: isProd ? basePath : "",
  assetPrefix: isProd ? basePath : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
