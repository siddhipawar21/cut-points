import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    // Resolves the "@/..." import alias to ./src, matching tsconfig.json's paths config.
    tsConfigPaths({ projects: ["./tsconfig.json"] }),

    tailwindcss(),

    // TanStack Start's own Vite plugin — this internally wires up the Nitro server build,
    // file-based routing codegen, and SSR. Order matters: this must come before viteReact().
    tanstackStart({
      server: { entry: "server" },
    }),

    viteReact(),
  ],
});
