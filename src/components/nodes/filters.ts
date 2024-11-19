import { s } from "hastscript";
import { baseToNode } from "../context/NodesContext";

export function filterNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Text",
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
      filterEffects: {
        type: "number",
        label: "Filter effects",
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
      type: "string",
      label: "Output",
      props: {
        placeholder: "Enter text...",
      },
    },
    function: (inputs) => {
      if (inputs.hast == null) return null;
      const root = structuredClone(inputs.hast);
      let defs = root.children.find((child) => child.tagName === "defs");
      if (defs == null) {
        defs = s("defs");
        root.children.unshift(defs);
      }
      defs.children.push(s(""));
      return root;
    },
  });
}
