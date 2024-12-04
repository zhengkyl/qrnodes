import {
  ApplyFilterNode,
  BlendNode,
  ColorMatrixNode,
  CompositeNode,
  DisplacementMapNode,
  FilterNode,
  GaussianBlurNode,
  ImageNode,
  MergeNode,
  MorphologyNode,
  SourceNode,
  TurbulenceNode,
} from "./filter";
import { TextNode, NumberNode, QrNode } from "./input";
import {
  AbsoluteMapNode,
  DataUrlNode,
  DisplayNode,
  RenderNode,
} from "./render";
import type { InputType, NodeInfo } from "./shared";

export const NODE_DEFS = {
  text: TextNode,
  number: NumberNode,
  qrCode: QrNode,
  //
  render: RenderNode,
  display: DisplayNode,
  dataUrl: DataUrlNode,
  absoluteMap: AbsoluteMapNode,
  //
  filter: FilterNode,
  applyFilter: ApplyFilterNode,
  source: SourceNode,
  //
  blend: BlendNode,
  colorMatrix: ColorMatrixNode,
  // componentTransfer
  composite: CompositeNode,
  // convolveMatrix
  displacementMap: DisplacementMapNode,
  // dropShadow
  // flood
  gaussianBlur: GaussianBlurNode,
  image: ImageNode,
  merge: MergeNode,
  morphology: MorphologyNode,
  // offset
  // tile
  turbulence: TurbulenceNode,
  // diffuseLighting
  // specularLighting
  // distantLight
  // pointLight
  // spotLight
};

type NodeInfoBase = {
  id: number;
  key: keyof typeof NODE_DEFS;
  x: number;
  y: number;
};

export function createNode(base: NodeInfoBase): NodeInfo {
  const nodeDef = NODE_DEFS[base.key];
  const node = base as unknown as NodeInfo;
  node.width = 0;
  node.height = 0;
  node.inputs = {};

  const entries = Object.entries(nodeDef.inputsDef);
  entries.forEach(([key, inputDef]) => {
    const initialValue = inputDef.initialValue;
    let value;
    if (initialValue === undefined) {
      if (inputDef.type === "select") {
        value = inputDef.props.options[0];
      } else {
        value = IMPLICIT_INITIAL_VALUE[inputDef.type];
      }
    } else if (typeof initialValue === "function") {
      value = initialValue(base.id);
    } else {
      value = initialValue;
    }
    node.inputs[key] = [
      {
        value,
        from: null,
        cx: 0,
        cy: 0,
        ref: null!,
      },
    ];
  });

  node.output = {
    value: entries.length === 0 ? nodeDef.function({}) : null,
    cx: 0,
    cy: 0,
    ref: null!,
  };

  return node;
}

const IMPLICIT_INITIAL_VALUE: {
  [k in Exclude<InputType, "select" | "color_matrix">]: any;
} = {
  string: "",
  number: 0,
  number_pair: [0, 0],
  qr_code: null,
  hast: null,
  hast_fe: null,
  hast_filter: null,
};
