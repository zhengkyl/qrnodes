import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const FilterNode = {
  title: "Filter",
  inputsDef: {
    id: {
      type: "string",
      label: "id",
    },
    results: {
      type: "hast_fe",
      label: "results",
      array: true,
    },
  },
  outputDef: {
    type: "hast_filter",
    label: "Filter",
  },
  function: (inputs) => {
    return s(
      "filter",
      { id: inputs.id },
      inputs.results.filter((res) => res != null).flatMap((res) => res.effects)
    );
  },
} satisfies NodeDef;

export const ApplyFilterNode = {
  title: "Apply Filter",
  inputsDef: {
    svg: {
      type: "hast",
      label: "SVG AST",
    },
    filter: {
      type: "hast_filter",
      label: "Filter",
      props: {},
    },
  },
  outputDef: {
    type: "hast",
    label: "Output",
  },
  function: (inputs) => {
    if (inputs.svg == null) return null;
    if (inputs.filter == null) return null;
    const root = structuredClone(inputs.svg);
    let defs = root.children.find((child) => child.tagName === "defs");
    if (defs == null) {
      defs = s("defs");
      root.children.unshift(defs);
    }
    const filterId = inputs.filter.properties.id;
    defs.children.push(inputs.filter);
    if (
      root.children.length > 2 ||
      (root.children.length === 2 && root.children[1].properties.filter != null)
    ) {
      const [defs, ...rest] = root.children;
      root.children = [defs, s("g", { filter: `url(#${filterId})` }, rest)];
    } else {
      root.children[1].properties.filter = `url(#${filterId})`;
    }
    return root;
  },
} satisfies NodeDef;

export const SourceNode = {
  title: "Source",
  inputsDef: {
    name: {
      type: "string",
      label: "name",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "result",
  },
  function: (inputs) => {
    return {
      name: inputs.name,
      effects: [],
    };
  },
} satisfies NodeDef;

export const GaussianBlurNode = {
  title: "Gaussian Blur",
  inputsDef: {
    in: {
      type: "hast_fe",
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
    result: {
      type: "string",
      label: "result",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    return {
      name: inputs.result,
      effects: [
        ...in1.effects,
        s(
          "feGaussianBlur",
          removeDefaults(
            {
              ...inputs,
              in: in1.name,
            },
            {
              stdDeviation: 0,
              edgeMode: "duplicate",
            }
          )
        ),
      ],
    };
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
    result: {
      type: "string",
      label: "result",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "result",
  },
  function: (inputs) => {
    return {
      name: inputs.result,
      effects: [
        s(
          "feTurbulence",
          removeDefaults(inputs, {
            type: "turbulence",
            baseFrequency: 0,
            numOctaves: 1,
            seed: 0,
            stitchTiles: "noStitch",
          })
        ),
      ],
    };
  },
} satisfies NodeDef;

export const DisplacementMapNode = {
  title: "DisplacementMap",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
    },
    in2: {
      type: "hast_fe",
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
    result: {
      type: "string",
      label: "result",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    const in2 = inputs.in2 ?? { name: undefined, effects: [] };
    return {
      name: inputs.result,
      effects: [
        ...dedupedEffects([...in1.effects, ...in2.effects]),
        s(
          "feDisplacementMap",
          removeDefaults(
            {
              ...inputs,
              in: in1.name,
              in2: in2.name,
            },
            {
              in2: "",
              scale: 0,
              xChannelSelector: "A",
              yChannelSelector: "A",
            }
          )
        ),
      ],
    };
  },
} satisfies NodeDef;

export const ImageNode = {
  title: "Image",
  inputsDef: {
    href: {
      type: "string",
      label: "href",
    },
    result: {
      type: "string",
      label: "result",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    return {
      name: inputs.result,
      effects: [s("feImage", inputs)],
    };
  },
} satisfies NodeDef;

export const MergeNode = {
  title: "Merge",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
      array: true,
    },
    result: {
      type: "string",
      label: "result",
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
  },
  function: (inputs) => {
    const mergeIn = inputs.in.filter((v) => v != null);
    return {
      name: inputs.result,
      effects: [
        ...dedupedEffects(mergeIn.flatMap((result) => result.effects)),
        s("feMerge", { result: inputs.result }, [
          ...mergeIn.map((result) => s("feMergeNode", { in: result.name })),
        ]),
      ],
    };
  },
} satisfies NodeDef;

function removeDefaults(inputs, defaults) {
  const nonDefault = {};
  Object.keys(inputs).forEach((key) => {
    if (inputs[key] !== defaults[key]) {
      nonDefault[key] = inputs[key];
    }
  });
  return nonDefault;
}

function dedupedEffects(effects) {
  const results = new Set();
  return effects.filter((node) => {
    const result = node.properties.result;
    if (result == null) {
      console.log("found node without result", node);
      return true;
    }
    if (results.has(result)) {
      return false;
    }
    results.add(result);
    return true;
  });
}
