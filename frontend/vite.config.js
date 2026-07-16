import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Emits a version.json on build and injects the build id into index.html so the
// runtime check in main.jsx can detect new deployments and refresh automatically.
function medoraBuildVersion() {
  return {
    name: "medora-build-version",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: { name: "medora-build", content: buildId },
            injectTo: "head",
          },
          {
            tag: "script",
            children: `window.__MEDORA_BUILD_ID__=${JSON.stringify(buildId)};`,
            injectTo: "head",
          },
        ],
      };
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), medoraBuildVersion()],
});
