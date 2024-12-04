import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const FilterNode = {
  title: "Filter",
  inputsDef: {
    id: {
      type: "string",
      label: "id",
      initialValue: (id) => `filter_${id}`,
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
      type: "select",
      label: "name",
      props: {
        options: [
          "SourceGraphic",
          "SourceAlpha",
          "BackgroundImage",
          "BackgroundAlpha",
          "FillPaint",
          "StrokePaint",
        ],
      },
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "result",
    placement: "lastInput",
  },
  function: (inputs) => {
    return {
      name: inputs.name,
      effects: [],
    };
  },
} satisfies NodeDef;

export const BlendNode = {
  title: "Blend",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
    },
    in2: {
      type: "hast_fe",
      label: "in2",
    },
    mode: {
      type: "select",
      label: "mode",
      props: {
        options: [
          "normal",
          "multiply",
          "screen",
          "overlay",
          "darken",
          "lighten",
          "color-dodge",
          "color-burn",
          "hard-light",
          "soft-light",
          "difference",
          "exclusion",
          "hue",
          "saturation",
          "color",
          "luminosity",
        ],
      },
    },
    result: {
      type: "string",
      label: "result",
      initialValue: (id) => `blend_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    const in2 = inputs.in2 ?? { name: undefined, effects: [] };
    inputs.in = in1.name;
    inputs.in2 = in2.name;
    return {
      name: inputs.result,
      effects: [
        ...dedupedEffects([...in1.effects, ...in2.effects]),
        s("feBlend", removeDefaults(inputs, { in2: "", mode: "normal" })),
      ],
    };
  },
} satisfies NodeDef;

export const ColorMatrixNode = {
  title: "Color Matrix",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
    },
    type: {
      type: "select",
      label: "type",
      props: {
        options: ["matrix", "saturate", "hueRotate", "luminanceToAlpha"],
      },
    },
    matrix: {
      type: "color_matrix",
      label: "values",
      // prettier-ignore
      initialValue: [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
      ],
      condition: (node) => node.inputs.type[0].value === "matrix",
    },
    saturate: {
      type: "number",
      label: "values",
      initialValue: 1,
      condition: (node) => node.inputs.type[0].value === "saturate",
    },
    hueRotate: {
      type: "number",
      label: "values",
      props: {
        min: 0,
        max: 360,
      },
      condition: (node) => node.inputs.type[0].value === "hueRotate",
    },
    result: {
      type: "string",
      label: "result",
      initialValue: (id) => `colorMatrix_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    const props = {
      in: in1.name,
      type: inputs.type,
      values: undefined,
      result: inputs.result,
    };
    if (inputs.type === "matrix") {
      props.values = inputs.matrix.join(" ");
    } else if (inputs.type === "saturate") {
      props.values = inputs.saturate;
    } else if (inputs.type === "hueRotate") {
      props.values = inputs.hueRotate;
    }
    return {
      name: inputs.result,
      effects: [...in1.effects, s("feColorMatrix", props)],
    };
  },
} satisfies NodeDef;

// TODO
// export const ComponentTransferNode = {
//   title: "Component Transfer",
//   inputsDef: {
//     in: {
//       type: "hast_fe",
//       label: "in",
//     },
//     type: {
//       type: "select",
//       label: "type",
//       props: {
//         options: ["identity", "table", "discrete", "linear", "gamma"],
//       },
//     },
//     tableValues: {
//       type: "table_values",
//       label: "tableValues",
//       initialValue: [1, 0, 0, 0],
//       condition: (node) =>
//         node.inputs.type[0].value === "table" ||
//         node.inputs.type[0].value === "discrete",
//     },
//     slope: {
//       type: "number",
//       label: "slope",
//       initialValue: 1,
//       condition: (node) => node.inputs.type[0].value === "linear",
//     },
//     intercept: {
//       type: "number",
//       label: "",
//       condition: (node) => node.inputs.type[0].value === "linear",
//     },
//     amplitude: {
//       type: "number",
//       label: "amplitude",
//       condition: (node) => node.inputs.type[0].value === "gamma",
//     },
//     exponent: {
//       type: "number",
//       label: "exponent",
//       condition: (node) => node.inputs.type[0].value === "gamma",
//     },
//     offset: {
//       type: "number",
//       label: "offset",
//       condition: (node) => node.inputs.type[0].value === "gamma",
//     },
//     result: {
//       type: "string",
//       label: "result",
//       initialValue: (id) => `componentTransfer_${id}`,
//     },
//   },
//   outputDef: {
//     type: "hast_fe",
//     label: "Output",
//     placement: "lastInput",
//   },
//   function: (inputs) => {
//     const in1 = inputs.in ?? { name: undefined, effects: [] };
//     const props = {
//       in: in1.name,
//       type: inputs.type,
//       result: inputs.result,
//     } as any;
//     switch (inputs.type) {
//       case "discrete":
//       case "table": {
//         props.tableValues = inputs.tableValues.join(" ");
//         break;
//       }
//       case "linear": {
//         props.slope = inputs.slope;
//         props.intercept = inputs.intercept;
//         break;
//       }
//       case "gamma": {
//         props.amplitude = inputs.amplitude;
//         props.exponent = inputs.exponent;
//         props.offset = inputs.offset;
//         break;
//       }
//     }
//     return {
//       name: inputs.result,
//       effects: [...in1.effects, s("feComponentTransfer", props)],
//     };
//   },
// };

export const CompositeNode = {
  title: "Composite",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
    },
    in2: {
      type: "hast_fe",
      label: "in2",
    },
    operator: {
      type: "select",
      label: "operator",
      props: {
        options: ["over", "in", "out", "atop", "xor", "lighter", "arithmetic"],
      },
    },
    k1: {
      type: "number",
      label: "k1",
      condition: (node) => node.inputs.operator[0].value === "arithmetic",
    },
    k2: {
      type: "number",
      label: "k2",
      condition: (node) => node.inputs.operator[0].value === "arithmetic",
    },
    k3: {
      type: "number",
      label: "k3",
      condition: (node) => node.inputs.operator[0].value === "arithmetic",
    },
    k4: {
      type: "number",
      label: "k4",
      condition: (node) => node.inputs.operator[0].value === "arithmetic",
    },
    result: {
      type: "string",
      label: "result",
      initialValue: (id) => `composite_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    const in2 = inputs.in2 ?? { name: undefined, effects: [] };
    inputs.in = in1.name;
    inputs.in2 = in2.name;
    if (inputs.operator !== "arithmetic") {
      delete inputs.k1;
      delete inputs.k2;
      delete inputs.k3;
      delete inputs.k4;
    }
    return {
      name: inputs.result,
      effects: [
        ...dedupedEffects([...in1.effects, ...in2.effects]),
        s("feComposite", inputs),
      ],
    };
  },
} satisfies NodeDef;

// TODO
// export const ConvolveMatrix = {

// } satisfies NodeDef;

export const DisplacementMapNode = {
  title: "Displacement Map",
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
      initialValue: (id) => `displacementMap_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    const in2 = inputs.in2 ?? { name: undefined, effects: [] };
    inputs.in = in1.name;
    inputs.in2 = in2.name;
    return {
      name: inputs.result,
      effects: [
        ...dedupedEffects([...in1.effects, ...in2.effects]),
        s(
          "feDisplacementMap",
          removeDefaults(inputs, {
            in2: "",
            scale: 0,
            xChannelSelector: "A",
            yChannelSelector: "A",
          })
        ),
      ],
    };
  },
} satisfies NodeDef;

// TODO
// export const DropShadow = {

// } satisfies NodeDef;

// TODO
// export const Flood = {

// } satisfies NodeDef;

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
        min: 0,
      },
      initialValue: 0.5,
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
      initialValue: (id) => `gaussianBlur_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    inputs.in = in1.name;
    inputs.stdDeviation = flattenPair(inputs.stdDeviation);
    return {
      name: inputs.result,
      effects: [
        ...in1.effects,
        s(
          "feGaussianBlur",
          removeDefaults(inputs, {
            stdDeviation: 0,
            edgeMode: "duplicate",
          })
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
      initialValue: (id) => `image_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
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
      initialValue: (id) => `merge_${id}`,
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

export const MorphologyNode = {
  title: "Morphology",
  inputsDef: {
    in: {
      type: "hast_fe",
      label: "in",
    },
    operator: {
      type: "select",
      label: "operator",
      props: {
        options: ["erode", "dilate"],
      },
    },
    radius: {
      type: "number_pair",
      label: "radius",
      props: {
        step: 0.1,
      },
      initialValue: [0, 0],
    },
    result: {
      type: "string",
      label: "result",
      initialValue: (id) => `morphology_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "Output",
    placement: "lastInput",
  },
  function: (inputs) => {
    const in1 = inputs.in ?? { name: undefined, effects: [] };
    inputs.in = in1.name;
    inputs.radius = flattenPair(inputs.radius);
    return {
      name: inputs.result,
      effects: [...in1.effects, s("feMorphology", inputs)],
    };
  },
} satisfies NodeDef;

// TODO
// export const OffsetNode = {

// }

// TODO
// export const Tile = {

// }

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
      type: "number_pair",
      label: "baseFrequency",
      props: {
        step: 0.001,
      },
      initialValue: [0.2, 0.2],
    },
    numOctaves: {
      type: "number",
      label: "numOctaves",
      initialValue: 1,
      props: {
        min: 1,
      },
    },
    seed: {
      type: "number",
      label: "seed",
      initialValue: 1,
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
      initialValue: (id) => `turbulence_${id}`,
    },
  },
  outputDef: {
    type: "hast_fe",
    label: "result",
    placement: "lastInput",
  },
  function: (inputs) => {
    inputs.baseFrequency = flattenPair(inputs.baseFrequency);
    return {
      name: inputs.result,
      effects: [
        s(
          "feTurbulence",
          removeDefaults(inputs, {
            type: "turbulence",
            baseFrequency: 0,
            numOctaves: 1,
            seed: 1,
            stitchTiles: "noStitch",
          })
        ),
      ],
    };
  },
} satisfies NodeDef;

// TODO
// export const DiffuseLighting = {

// } satisfies NodeDef;

// TODO
// export const SpecularLighting = {

// } satisfies NodeDef;

// TODO
// export const DistantLight = {

// } satisfies NodeDef;

// TODO
// export const PointLight = {

// }
// TODO
// export const SpotLight = {

// }

function flattenPair(pair) {
  const x = pair[0];
  const y = pair[1];
  if (x == y) {
    return x;
  }
  return `${x} ${y}`;
}

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
