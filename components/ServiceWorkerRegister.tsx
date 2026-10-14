"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) solo en producción, para no
// interferir con el hot reload de `next dev`.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
