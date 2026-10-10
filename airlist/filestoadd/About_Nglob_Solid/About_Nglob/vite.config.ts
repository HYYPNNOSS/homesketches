import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    {
      name: "about-preview-route",
      configurePreviewServer(server) {
        server.middlewares.use((request, _response, next) => {
          const [pathname, query] = (request.url || "/").split("?");
          if (pathname.replace(/\/$/, "") === "/about") {
            request.url = "/about/index.html" + (query ? "?" + query : "");
          }
          next();
        });
      },
    },
  ],
  base: "/",
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
