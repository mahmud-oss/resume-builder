import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Lets tests use the same "@/..." shortcut as the app.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
