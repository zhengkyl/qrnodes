import {
  DisplacementMapNode,
  FilterNode,
  GaussianBlurNode,
  ImageNode,
  TurbulenceNode,
} from "./filter";
import { TextNode, NumberNode, QrNode } from "./input";
import {
  AbsoluteMapNode,
  DataUrlNode,
  DisplayNode,
  RenderNode,
} from "./render";
import type { NodeInfo } from "./shared";

export const NODE_DEFS = {
  text: TextNode,
  number: NumberNode,
  qrCode: QrNode,
  render: RenderNode,
  display: DisplayNode,
  filter: FilterNode,
  gaussianBlur: GaussianBlurNode,
  turbulence: TurbulenceNode,
  displacementMap: DisplacementMapNode,
  image: ImageNode,
  dataUrl: DataUrlNode,
  absoluteMap: AbsoluteMapNode,
};

export const NODE_CONSTRUCTORS: {
  [key in keyof typeof NODE_DEFS]: (coords: {
    id: number;
    x: number;
    y: number;
  }) => NodeInfo;
} = {
  /** Input nodes */
  text: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "text",
      inputs: {},
      output: {
        value: "",
      },
    }),
  number: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "number",
      inputs: {},
      output: {
        value: 0,
      },
    }),
  qrCode: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "qrCode",
      inputs: {
        text: [{ value: "hello there" }],
        minVersion: [{ value: 1 }],
        minEcl: [{ value: "Low" }],
        mask: [{ value: "Auto" }],
      },
      output: {
        value: null,
      },
    }),
  /** Render nodes */
  render: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "render",
      inputs: {
        qrCode: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  absoluteMap: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "absoluteMap",
      inputs: {
        qrCode: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  dataUrl: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "dataUrl",
      inputs: {
        hast: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  display: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "display",
      inputs: {
        hast: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  /** Filter nodes */
  filter: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "filter",
      inputs: {
        id: [{ value: (id) => `filter_${id}` }],
        hast: [{ value: null }],
        effects: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  gaussianBlur: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "gaussianBlur",
      inputs: {
        in: [{ value: "SourceGraphic" }],
        stdDeviation: [{ value: 0.5 }],
        edgeMode: [{ value: "duplicate" }],
      },
      output: {
        value: null,
      },
    }),
  turbulence: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "turbulence",
      inputs: {
        type: [{ value: "turbulence" }],
        baseFrequency: [{ value: 0.2 }],
        numOctaves: [{ value: 1 }],
        seed: [{ value: 0 }],
        stitchTiles: [{ value: "noStitch" }],
      },
      output: {
        value: null,
      },
    }),
  displacementMap: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "displacementMap",
      inputs: {
        in: [{ value: "SourceGraphic" }],
        in2: [{ value: "" }],
        scale: [{ value: 1.5 }],
        xChannelSelector: [{ value: "A" }],
        yChannelSelector: [{ value: "A" }],
      },
      output: {
        value: null,
      },
    }),
  image: ({ id, x, y }) =>
    createNode({
      id,
      x,
      y,
      key: "image",
      inputs: {
        href: [{ value: "" }],
        x: [{ value: "" }],
        y: [{ value: "" }],
        width: [{ value: "" }],
        height: [{ value: "" }],
      },
      output: {
        value: null,
      },
    }),
};

type NodeInfoBase<T extends keyof typeof NODE_DEFS> = {
  id: number;
  key: T;
  x: number;
  y: number;
  inputs: {
    [key in keyof (typeof NODE_DEFS)[T]["inputsDef"]]: [
      {
        value: any; // depends on type
      }
    ];
  };
  output: {
    value: any; // depends on type
  };
};

export function createNode<T extends keyof typeof NODE_DEFS>(
  base: NodeInfoBase<T>
): NodeInfo {
  const node = {
    id: base.id,
    key: base.key,
    x: base.x,
    y: base.y,
    width: 0,
    height: 0,
    inputs: base.inputs,
    output: base.output,
  } as unknown as NodeInfo;

  Object.values(node.inputs).forEach((input) => {
    input.forEach((field) => {
      if (typeof field.value === "function") {
        field.value = field.value(node.id);
      }
      field.from = null;
      field.cx = 0;
      field.cy = 0;
      field.ref = null!;
    });
  });

  node.output.cx = 0;
  node.output.cx = 0;
  node.output.ref = null!;

  return node;
}
