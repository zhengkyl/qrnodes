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
        base: "#131212",
        subtle: "#252323",
        distinct: "#3d3e3e",
      },
    },
    transitionProperty: {
      scale: "scale",
    },
  },
});
