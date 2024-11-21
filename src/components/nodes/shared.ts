type InputType = "string" | "number" | "qrCode" | "select" | "hast" | "hast_fe";

export type NodeDef = {
  title: string;
  inputDefs: {
    [key: string]: {
      type: InputType;
      label: string;
      array?: true;
      props?: {
        [key: string]: any;
      };
    };
  };
  outputDef: {
    type: InputType | "display";
    label: string;
    props?: {
      [key: string]: any;
    };
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
