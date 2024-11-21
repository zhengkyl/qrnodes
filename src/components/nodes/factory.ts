import {
  DisplacementMapNode,
  FilterNode,
  GaussianBlurNode,
  TurbulenceNode,
} from "./filter";
import { TextNode, NumberNode, QrNode } from "./input";
import { DisplayNode, RenderNode } from "./render";
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
};

export const NODE_CONSTRUCTORS: {
  [key in keyof typeof NODE_DEFS]: (coords: {
    x: number;
    y: number;
  }) => NodeInfo;
} = {
  /** Input nodes */
  text: ({ x, y }) =>
    createNode({
      x,
      y,
      key: "text",
      inputs: {},
      output: {
        value: "",
      },
    }),
  number: ({ x, y }) =>
    createNode({
      x,
      y,
      key: "number",
      inputs: {},
      output: {
        value: 0,
      },
    }),
  qrCode: ({ x, y }) =>
    createNode({
      x,
      y,
      key: "qrCode",
      inputs: {
        text: [{ value: "" }],
        minVersion: [{ value: 1 }],
        minEcl: [{ value: "Low" }],
        mask: [{ value: "Auto" }],
      },
      output: {
        value: null,
      },
    }),
  /** Render nodes */
  render: ({ x, y }) =>
    createNode({
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
  display: ({ x, y }) =>
    createNode({
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
  filter: ({ x, y }) =>
    createNode({
      x,
      y,
      key: "filter",
      inputs: {
        hast: [{ value: null }],
        effects: [{ value: null }],
      },
      output: {
        value: null,
      },
    }),
  gaussianBlur: ({ x, y }) =>
    createNode({
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
  turbulence: ({ x, y }) =>
    createNode({
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
  displacementMap: ({ x, y }) =>
    createNode({
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
};

type NodeInfoBase<T extends keyof typeof NODE_DEFS> = {
  key: T;
  x: number;
  y: number;
  inputs: {
    [key in keyof (typeof NODE_DEFS)[T]["inputDefs"]]: [
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
    id: 0,
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
