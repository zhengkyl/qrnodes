import { baseToNode } from "../context/NodesContext";
import { generate, QrOptions } from "fuqr";
import { s } from "hastscript";

export function textNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Text",
    inputs: {},
    output: {
      type: "string",
      label: "Output",
    },
    function: () => {},
  });
}

export function displayNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Display",
    inputs: {
      hast: {
        type: "hast",
        label: "HTML AST",
        value: null,
      },
    },
    output: {
      type: "display",
      label: "Output",
    },
    function: (inputs) => {
      return inputs.hast;
    },
  });
}

export function fuqrNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "QR Code",
    inputs: {
      text: {
        type: "string",
        label: "Text",
        value: "",
      },
    },
    output: {
      type: "fuqr",
      label: "QR Code",
    },
    function: (inputs) => {
      return generate(inputs.text, new QrOptions());
    },
  });
}

export function renderNode({ x, y }) {
  return baseToNode({
    x,
    y,
    title: "Renderer",
    inputs: {
      qrCode: {
        type: "fuqr",
        label: "QR Code",
        value: null,
      },
    },
    output: {
      type: "hast",
      label: "HTML AST",
    },
    function: (inputs) => {
      if (inputs.qrCode == null) return;
      const width = inputs.qrCode.version * 4 + 17;

      const margin = 2;
      let d = "";
      for (let y = 0; y < width; y++) {
        for (let x = 0; x < width; x++) {
          if (inputs.qrCode.matrix[y * width + x] & 1) {
            d += `M${x + margin},${y + margin}h1v1h-1z`;
          }
        }
      }
      const fullWidth = width + 2 * margin;
      return s(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewbox: `0 0 ${fullWidth} ${fullWidth}`,
        },
        [
          s("path", {
            d: `M0,0h${fullWidth}v${fullWidth}h-${fullWidth}z`,
            fill: "white",
          }),
          s("path", { d, fill: "black" }),
        ]
      );
    },
  });
}

export const NODE_MAP = {
  Text: textNode,
  "QR Code": fuqrNode,
  Renderer: renderNode,
  Display: displayNode,
};
