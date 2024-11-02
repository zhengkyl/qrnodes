import { defineConfig, transformerVariantGroup } from "unocss";

export default defineConfig({
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      fore: {
        base: "#fafafa",
        subtle: "#858c8a",
        // border in index.css
      },
      back: {
        base: "#0e0f0f",
        subtle: "#1a1b1c",
        distinct: "#3d3e3e",
      },
    },
  },
});
