import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const FilterNode = {
  title: "Filter",
  inputsDef: {
    id: {
      type: "string",
      label: "id",
    },
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
    defs.children.push(s("filter", { id: inputs.id }, inputs.effects));
    if (
      root.children.length > 2 ||
      (root.children.length === 2 && root.children[1].filter != null)
    ) {
      const [defs, ...rest] = root.children;
      root.children = [defs, s("g", { filter: `url(#${inputs.id})` }, rest)];
    } else {
      root.children[1].filter = `url(#${inputs.id})`;
    }
    return root;
  },
} satisfies NodeDef;

export const GaussianBlurNode = {
  title: "Gaussian Blur",
  inputsDef: {
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
    return s(
      "feGaussianBlur",
      dedupe(inputs, {
        in: "",
        stdDeviation: 0,
        edgeMode: "duplicate",
      })
    );
  },
} satisfies NodeDef;

export const TurbulenceNode = {
  title: "Turbulence",
  inputsDef: {
    type: {
      type: "select",
      label: "Type",
      props: {
        options: ["turbulence", "fractalNoise"],
      },
    },
    baseFrequency: {
      type: "number",
      label: "baseFrequency",
      props: {
        step: 0.01,
      },
    },
    numOctaves: {
      type: "number",
      label: "numOctaves",
    },
    seed: {
      type: "number",
      label: "seed",
    },
    stitchTiles: {
      type: "select",
      label: "stitchTiles",
      props: {
        options: ["noStitch", "stitch"],
      },
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    return s(
      "feTurbulence",
      dedupe(inputs, {
        type: "turbulence",
        baseFrequency: 0,
        numOctaves: 1,
        seed: 0,
        stitchTiles: "noStitch",
      })
    );
  },
} satisfies NodeDef;

export const DisplacementMapNode = {
  title: "DisplacementMap",
  inputsDef: {
    in: {
      type: "string",
      label: "in",
    },
    in2: {
      type: "string",
      label: "in2",
    },
    scale: {
      type: "number",
      label: "scale",
      props: {
        step: 0.1,
      },
    },
    xChannelSelector: {
      type: "select",
      label: "xChannelSelector",
      props: {
        options: ["R", "G", "B", "A"],
      },
    },
    yChannelSelector: {
      type: "select",
      label: "yChannelSelector",
      props: {
        options: ["R", "G", "B", "A"],
      },
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    return s(
      "feDisplacementMap",
      dedupe(inputs, {
        in: "",
        in2: "",
        scale: 0,
        xChannelSelector: "A",
        yChannelSelector: "A",
      })
    );
  },
} satisfies NodeDef;

export const ImageNode = {
  title: "Image",
  inputsDef: {
    href: {
      type: "string",
      label: "href",
    },
    x: {
      type: "string",
      label: "x",
    },
    y: {
      type: "string",
      label: "y",
    },
    width: {
      type: "string",
      label: "width",
    },
    height: {
      type: "string",
      label: "height",
    },
    // preserveAspectRatio: {
    //   type: "string",
    //   label: "",
    // },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    return s("feImage", inputs);
  },
} satisfies NodeDef;

function dedupe(inputs, defaults) {
  const deduped = {};
  Object.keys(inputs).forEach((key) => {
    if (inputs[key] !== defaults[key]) {
      deduped[key] = inputs[key];
    }
  });
  return deduped;
}
