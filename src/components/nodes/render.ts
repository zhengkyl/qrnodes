import { toHtml } from "hast-util-to-html";
import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const BackgroundNode = {
  title: "Background",
  inputsDef: {
    qrCode: {
      type: "qr_code",
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
    const scale = 10;
    const fullWidth = (width + 2 * margin) * scale;
    return s(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewbox: `0 0 ${fullWidth} ${fullWidth}`,
      },
      [
        s("rect", {
          y: 0,
          x: 0,
          width: fullWidth,
          height: fullWidth,
          fill: "white",
        }),
      ]
    );
  },
} satisfies NodeDef;

export const ForegroundNode = {
  title: "Foreground",
  inputsDef: {
    qrCode: {
      type: "qr_code",
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
    const scale = 10;
    let d = "";
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        if (inputs.qrCode.matrix[y * width + x] & 1) {
          let nx = (x + margin) * scale;
          let ny = (y + margin) * scale;
          d += `M${nx},${ny}h${scale}v${scale}h-${scale}z`;
        }
      }
    }
    const fullWidth = (width + 2 * margin) * scale;
    return s(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewbox: `0 0 ${fullWidth} ${fullWidth}`,
      },
      [s("path", { d, fill: "black" })]
    );
  },
} satisfies NodeDef;

export const RenderNode = {
  title: "Render",
  inputsDef: {
    qrCode: {
      type: "qr_code",
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
    const scale = 10;
    let d = "";

    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        if (inputs.qrCode.matrix[y * width + x] & 1) {
          let nx = (x + margin) * scale;
          let ny = (y + margin) * scale;
          d += `M${nx},${ny}h${scale}v${scale}h-${scale}z`;
        }
      }
    }
    const fullWidth = (width + 2 * margin) * scale;
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

export const CombineNode = {
  title: "Combine",
  inputsDef: {
    svg: {
      type: "hast",
      label: "SVG",
      array: true,
    },
  },
  outputDef: {
    type: "hast",
    label: "HTML AST",
  },
  function: (inputs) => {
    const svgs = inputs.svg.filter((svg) => svg != null);
    if (svgs.length === 0) return null;
    return s(
      "svg",
      svgs[0].properties,
      svgs.flatMap((svg) => svg.children)
    );
  },
} satisfies NodeDef;

export const AbsoluteMapNode = {
  title: "Absolute Map",
  inputsDef: {
    xColor: {
      type: "string",
      label: "X color",
      initialValue: "#ff0000",
    },
    yColor: {
      type: "string",
      label: "Y color",
      initialValue: "#0000ff",
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
        width: 256,
        height: 256,
      },
      [
        s("defs", {}, [
          s(
            "linearGradient",
            { id: "xGradient", x1: "0%", x2: "100%", y1: "0%", y2: "0%" },
            [
              s("stop", {
                offset: "0%",
                stopColor: inputs.xColor,
              }),
              s("stop", {
                offset: "100%",
                stopColor: inputs.xColor,
                stopOpacity: "0",
              }),
            ]
          ),
          s(
            "linearGradient",
            { id: "yGradient", x1: "0%", x2: "0%", y1: "0%", y2: "100%" },
            [
              s("stop", {
                offset: "0%",
                stopColor: inputs.yColor,
              }),
              s("stop", {
                offset: "100%",
                stopColor: inputs.yColor,
                stopOpacity: "0",
              }),
            ]
          ),
        ]),
        s("rect", {
          fill: "#000000",
          width: "100%",
          height: "100%",
        }),
        s("rect", {
          fill: "url(#xGradient)",
          width: "100%",
          height: "100%",
        }),
        s("rect", {
          fill: "url(#yGradient)",
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
    connector: "none",
  },
  function: (inputs) => {
    if (inputs.hast == null) return null;
    if (inputs.hast.properties.width || inputs.hast.properties.height) {
      console.error(
        "qrnodes: <svg> should not have width or height attributes"
      );
      inputs.hast.properties.width = undefined;
      inputs.hast.properties.height = undefined;
    }
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
