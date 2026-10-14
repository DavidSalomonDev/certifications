import type { MetadataRoute } from "next";

// Web App Manifest: permite instalar la app (PWA) en iPad/iPhone/Android/escritorio.
// Next.js lo sirve en /manifest.webmanifest y agrega el <link> automáticamente.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Práctica de Certificaciones",
    short_name: "Certificaciones",
    description: "Práctica de exámenes de certificación (AZ-104 y más).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    lang: "es",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
