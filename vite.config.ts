import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import solid from "vite-plugin-solid";
import wasmPack from "vite-plugin-wasm-pack";

export default defineConfig({
  plugins: [UnoCSS(), solid(), wasmPack([], ["fuqr"])],
});
