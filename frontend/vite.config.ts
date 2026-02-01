import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/logger/ui/",
  // server: {
  //   proxy: {
  //     // любые запросы на /logger проксируются на твой бэкенд
  //     "/logger": {
  //       target: "http://192.168.1.53:8000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
});
