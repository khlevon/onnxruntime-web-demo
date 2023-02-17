import path from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        // "inference.worker": path.resolve(
        //   __dirname,
        //   "src/workers/inference.worker.ts"
        // ),
      },
      output: {
        entryFileNames: (assetInfo) => {
          // if (assetInfo.name.endsWith(".worker")) {
          //   return "assets/[name].js";
          // }

          return "assets/[name]-[hash].js";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "onnxruntime-web": path.resolve(
        __dirname,
        "node_modules/onnxruntime-web/dist/ort-web.es6.min.js"
      ),
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/onnxruntime-web/dist/*.wasm",
          dest: "assets/artifacts",
        },
        {
          src: "src/artifacts/*.*",
          dest: "assets/artifacts",
        },
      ],
    }),
  ],
});
