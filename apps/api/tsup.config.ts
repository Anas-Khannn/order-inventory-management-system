import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  clean: true,
  noExternal: ["@repo/shared"], // bundle the workspace package; everything else stays a normal dependency
});
