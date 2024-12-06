import {
  ApplyFilterNode,
  BlendNode,
  ColorMatrixNode,
  ComponentTransferFuncNode,
  ComponentTransferNode,
  CompositeNode,
  ConvolveMatrixNode,
  DiffuseLightingNode,
  DisplacementMapNode,
  DistantLightNode,
  DropShadowNode,
  FilterNode,
  FloodNode,
  GaussianBlurNode,
  ImageNode,
  MergeNode,
  MorphologyNode,
  OffsetNode,
  PointLightNode,
  SourceNode,
  SpecularLightingNode,
  SpotLightNode,
  TileNode,
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
  componentTransfer: ComponentTransferNode,
  componentTransferFunc: ComponentTransferFuncNode,
  composite: CompositeNode,
  convolveMatrix: ConvolveMatrixNode,
  displacementMap: DisplacementMapNode,
  dropShadow: DropShadowNode,
  flood: FloodNode,
  gaussianBlur: GaussianBlurNode,
  image: ImageNode,
  merge: MergeNode,
  morphology: MorphologyNode,
  offset: OffsetNode,
  tile: TileNode,
  turbulence: TurbulenceNode,
  diffuseLighting: DiffuseLightingNode,
  specularLighting: SpecularLightingNode,
  distantLight: DistantLightNode,
  pointLight: PointLightNode,
  spotLight: SpotLightNode,
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
    if (typeof inputDef === "function") {
      inputDef = inputDef(node);
    }
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
  [k in Exclude<InputType, "select" | "matrix">]: any;
} = {
  boolean: false,
  string: "",
  number: 0,
  number_pair: [0, 0],
  qr_code: null,
  hast: null,
  hast_fe: null,
  hast_filter: null,
  hast_light: null,
  component_transfer_func: null,
};
