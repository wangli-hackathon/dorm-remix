import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { lux3dDevApi } from "./server/plugin.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: "./",
    plugins: [
      react(),
      tailwindcss(),
      lux3dDevApi({
        AHOLO_API_KEY: env.AHOLO_API_KEY,
        AHOLO_REGION: env.AHOLO_REGION,
        AHOLO_API_BASE: env.AHOLO_API_BASE,
        LUX3D_VERSION: env.LUX3D_VERSION,
        LUX3D_FACE_COUNT: env.LUX3D_FACE_COUNT,
        VITE_AHOLO_API_KEY: env.VITE_AHOLO_API_KEY,
      }),
    ],
    server: { host: "0.0.0.0", port: 47321, strictPort: true },
    preview: { host: "0.0.0.0", port: 47321, strictPort: true },
  };
});
