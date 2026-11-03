import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, ExpirationPlugin } from "serwist";

// This declares the value of `injectionPoint` to typescript.
// `injectionPoint` is the string that will be replaced by the actual precache list.
// By default, this string is set to "self.__WB_MANIFEST".
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Live updates (a long-lived event stream) and agent endpoints must never be
// cached or answered from a cache (KTD8).
const isUncachedApi = ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
  sameOrigin &&
  (url.pathname === "/api/events" ||
    url.pathname === "/api/mcp" ||
    url.pathname.startsWith("/api/agent/"));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: isUncachedApi,
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }: { request: Request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "documents",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
          }),
        ],
      }),
    },
    {
      matcher: ({ request }: { request: Request }) =>
        request.destination === "image" ||
        request.url.includes("googleusercontent.com"),
      handler: new NetworkFirst({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
