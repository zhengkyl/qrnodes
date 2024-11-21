import { s } from "hastscript";
import { toHtml } from "hast-util-to-html";
import type { NodeDef } from "./shared";

export const DisplayNode = {
  title: "Display",
  inputDefs: {
    hast: {
      type: "hast",
      label: "HTML AST",
    },
  },
  outputDef: {
    type: "display",
    label: "Output",
  },
  function: (inputs) => {
    if (inputs.hast == null) return null;
    return toHtml(inputs.hast);
  },
} satisfies NodeDef;

export const RenderNode = {
  title: "Renderer",
  inputDefs: {
    qrCode: {
      type: "qrCode",
      label: "QR Code",
    },
  },
  outputDef: {
    type: "hast",
    label: "HTML AST",
  },
  function: (inputs) => {
    if (inputs.qrCode == null) return null;
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
} satisfies NodeDef;
