export type InputType =
  | "boolean"
  | "string"
  | "textarea"
  | "number"
  | "number_pair"
  | "matrix"
  | "qr_code"
  | "select"
  | "hast"
  | "hast_fe"
  | "hast_filter"
  | "hast_light"
  | "component_transfer_func";

export type NodeDef = {
  title: string;
  inputsDef: {
    [key: string]: {
      type: InputType;
      label: string;
      array?: true;
      props?: {
        [key: string]: any;
      };
      initialValue?: any;
      condition?: (node: NodeInfo) => boolean;
    };
  };
  outputDef: {
    type: InputType | "display" | "component_transfer_func";
    label: string;
    props?: {
      [key: string]: any;
    };
    connector?: "none" | "lastInput";
  };
  function: (inputs: any) => any;
};

export type NodeInfo = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
  inputs: {
    [key: string]: {
      value: any; // depends on type
      from: number | null;
      cx: number; // relative to node
      cy: number; // relative to node
      ref: HTMLDivElement;
    }[];
  };
  output: {
    value: any; // depends on type
    cx: number; // relative to node
    cy: number; // relative to node
    ref: HTMLDivElement;
  };
};
