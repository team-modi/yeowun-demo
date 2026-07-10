import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/util", import.meta.url)),
      "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@layout": fileURLToPath(new URL("./src/layout", import.meta.url)),
      "@router": fileURLToPath(new URL("./src/router", import.meta.url)),
      "@store": fileURLToPath(new URL("./src/store", import.meta.url)),
      "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      "@auth": fileURLToPath(new URL("./src/auth", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        // 로컬 백엔드가 없으면 운영(베타) 백엔드로 프록시. 로컬 기동 시 VITE_API_PROXY_TARGET=http://localhost:8080 로 오버라이드.
        target: process.env.VITE_API_PROXY_TARGET || "http://3.35.111.143:8080",
        changeOrigin: true,
        // 운영 백엔드 CORS 허용목록에 localhost:3000 이 없어 브라우저 Origin 을 그대로 보내면 403.
        // 배포(Vercel rewrite)는 same-origin 이라 Origin 이 없다 → 프록시에서도 Origin 을 제거해 동일 조건으로 맞춘다.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
});
