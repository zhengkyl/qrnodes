import { s } from "hastscript";
import { toHtml } from "hast-util-to-html";
import type { NodeDef } from "./shared";

export const RenderNode = {
  title: "Renderer",
  inputsDef: {
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

export const AbsoluteMapNode = {
  title: "Absolute Map",
  inputsDef: {
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
    return s(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewbox: `0 0 256 256`,
      },
      [
        s("defs", {}, [
          s(
            "linearGradient",
            { id: "redGradient", x1: 0, x2: 1, y1: 0, y2: 0 },
            [
              s("stop", { offset: "0%", stopColor: "red", stopOpacity: "1" }),
              s("stop", { offset: "100%", stopColor: "red", stopOpacity: "0" }),
            ]
          ),
          s(
            "linearGradient",
            { id: "blueGradient", x1: 0, x2: 0, y1: 0, y2: 1 },
            [
              s("stop", { offset: "0%", stopColor: "blue", stopOpacity: "1" }),
              s("stop", {
                offset: "100%",
                stopColor: "blue",
                stopOpacity: "0",
              }),
            ]
          ),
        ]),
        s("rect", {
          fill: "black",
          width: "100%",
          height: "100%",
        }),
        s("rect", {
          fill: "url(#redGradient)",
          width: "100%",
          height: "100%",
        }),
        s("rect", {
          fill: "url(#blueGradient)",
          width: "100%",
          height: "100%",
          style: "mix-blend-mode:screen",
        }),
      ]
    );
  },
} satisfies NodeDef;

export const DisplayNode = {
  title: "Display",
  inputsDef: {
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

export const DataUrlNode = {
  title: "DataURL",
  inputsDef: {
    hast: {
      type: "hast",
      label: "HTML AST",
    },
  },
  outputDef: {
    type: "string",
    label: "Output",
  },
  function: (inputs) => {
    if (inputs.hast == null) return null;
    return `data:image/svg+xml,${toHtml(inputs.hast).replaceAll("#", "%23")}`;
  },
} satisfies NodeDef;
