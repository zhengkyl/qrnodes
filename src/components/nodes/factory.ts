import {
  ApplyFilterNode,
  CompositeNode,
  DisplacementMapNode,
  FilterNode,
  GaussianBlurNode,
  ImageNode,
  MergeNode,
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
  gaussianBlur: GaussianBlurNode,
  turbulence: TurbulenceNode,
  displacementMap: DisplacementMapNode,
  image: ImageNode,
  merge: MergeNode,
  composite: CompositeNode,
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

  Object.entries(nodeDef.inputsDef).forEach(([key, inputDef]) => {
    const initialValue = inputDef.initialValue;
    let value;
    if (initialValue === undefined) {
      if (key === "select") {
        value = inputDef.props.options[0];
      } else {
        value = IMPLICIT_INITIAL_VALUE[key];
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
    value: null,
    cx: 0,
    cy: 0,
    ref: null!,
  };

  return node;
}

const IMPLICIT_INITIAL_VALUE: { [k in Exclude<InputType, "select">]: any } = {
  string: "",
  number: 0,
  qrCode: null,
  hast: null,
  hast_fe: null,
  hast_filter: null,
};
