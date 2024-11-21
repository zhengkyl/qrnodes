import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const FilterNode = {
  title: "Filter",
  inputDefs: {
    hast: {
      type: "hast",
      label: "SVG AST",
    },
    effects: {
      type: "hast_fe",
      label: "Effects",
      array: true,
      props: {},
    },
  },
  outputDef: {
    type: "hast",
    label: "Output",
  },
  function: (inputs) => {
    if (inputs.hast == null) return null;
    const root = structuredClone(inputs.hast);
    let defs = root.children.find((child) => child.tagName === "defs");
    if (defs == null) {
      defs = s("defs");
      root.children.unshift(defs);
    }
    defs.children.push(s("filter", { id: "temp_gaussian" }, inputs.effects));
    if (
      root.children.length > 2 ||
      (root.children.length === 2 && root.children[1].filter != null)
    ) {
      const [defs, ...rest] = root.children;
      root.children = [defs, s("g", { filter: "url(#temp_gaussian)" }, rest)];
    } else {
      root.children[1].filter = "url(#temp_gaussian)";
    }
    return root;
  },
} satisfies NodeDef;

export const GaussianBlurNode = {
  title: "Gaussian Blur",
  inputDefs: {
    in: {
      type: "string",
      label: "in",
    },
    stdDeviation: {
      type: "number",
      label: "stdDeviation",

      props: {
        step: 0.1,
      },
    },
    edgeMode: {
      type: "select",
      label: "edgeMode",
      props: {
        options: ["duplicate", "wrap", "none"],
      },
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    return s("feGaussianBlur", inputs);
  },
} satisfies NodeDef;
