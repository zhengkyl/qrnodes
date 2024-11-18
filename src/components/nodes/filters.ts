import { s } from "hastscript";
import { baseToNode } from "../context/NodesContext";

export function feTurbulenceNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Text",
    inputs: {
      hast: {
        type: "hast",
        label: "SVG AST",
        value: null,
      },
      filterEffects: {
        type: "array",
        label: "Filter effects",
        array: [
          {
            type: "number",
            label: "n1",
            value: 0,
          },
          {
            type: "number",
            label: "in2",
            value: 0,
          },
        ],
        props: {
          type: "",
        },
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
      if (inputs.hast === null) return null;
      const root = structuredClone(inputs.hast);
      let defs = root.children.find((child) => child.tagName === "defs");
      if (defs == null) {
        defs = s("defs");
        root.children.unshift(defs);
      }
      defs.push(s(""));
      return root;
    },
  });
}
