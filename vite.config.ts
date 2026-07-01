import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "placeholder.svg", "pwa-512.png"],
      manifest: {
        name: "Cozy Cinema",
        short_name: "Cozy Cinema",
        description:
          "A cozy space for friends to share movie nights, collect digital tickets, and journal beautiful memories together.",
        theme_color: "#8b3a3a",
        background_color: "#fdf6ec",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\/callback/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\.(?:js|css|woff2)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
