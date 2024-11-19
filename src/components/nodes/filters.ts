import { s } from "hastscript";
import { baseToNode } from "../context/NodesContext";
import { unwrap } from "solid-js/store";

export function filterNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Filter",
    inputs: {
      hast: {
        type: "hast",
        label: "SVG AST",
        fields: [
          {
            value: null,
          },
        ],
      },
      effects: {
        type: "hast",
        label: "Effects",
        array: true,
        fields: [
          {
            value: null,
          },
        ],
        props: {},
      },
    },
    output: {
      type: "hast",
      label: "Output",
    },
    function: (inputs) => {
      if (inputs.hast == null) return null;
      const root = structuredClone(unwrap(inputs.hast));
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
  });
}

export function gaussianBlurNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Gaussian Blur",
    inputs: {
      in: {
        type: "string",
        label: "in",
        fields: [
          {
            value: "SourceGraphic",
          },
        ],
      },
      stdDeviation: {
        type: "number",
        label: "stdDeviation",
        fields: [
          {
            value: 0.5,
          },
        ],
        props: {
          step: 0.1,
        },
      },
      edgeMode: {
        type: "select",
        label: "edgeMode",
        fields: [{ value: "duplicate" }],
        props: {
          options: ["duplicate", "wrap", "none"],
        },
      },
    },
    output: {
      type: "hast",
      label: "Output",
    },
    function: (inputs) => {
      return s("feGaussianBlur", inputs);
    },
  });
}
