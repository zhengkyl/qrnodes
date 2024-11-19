import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";

export const NodesContext = createContext<{
  activeIds: Accessor<number[]>;
  setActiveIds: Setter<number[]>;
  nodes: (NodeCommon | null)[];
  addNode: (node: NodeCommon) => number;
  removeNode: (id: number) => void;
  setNodes: SetStoreFunction<(NodeCommon | null)[]>;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  const [nodes, setNodes] = createStore<(NodeCommon | null)[]>([]);
  const freeIds: number[] = [];

  const addNode = (node) => {
    node.id = freeIds.pop() ?? nodes.length;
    setNodes(node.id, node);
    return node.id;
  };
  const removeNode = (id) => {
    setNodes(id, null);
    freeIds.push(id);
  };

  const [activeIds, setActiveIds] = createSignal<number[]>([]);

  return (
    <NodesContext.Provider
      value={{
        activeIds,
        setActiveIds,
        nodes,
        addNode,
        removeNode,
        setNodes,
      }}
    >
      {props.children}
    </NodesContext.Provider>
  );
}

export function useNodesContext() {
  const context = useContext(NodesContext);
  if (!context) {
    throw new Error("useNodesContext: used outside NodesContextProvider");
  }
  return context;
}

export function baseToNode<T extends InputsBase>(
  base: NodeBase<T>
): NodeCommon {
  const node = base as unknown as NodeCommon;

  const values = Object.values(node.inputs);
  values.forEach((input) => {
    input.fields.forEach((field) => {
      field.from = null;
      field.cx = 0;
      field.cy = 0;
    });
  });
  node.output.field = {
    value: values.length ? null : node.function({}),
    cx: 0,
    cy: 0,
    ref: null!,
  };

  node.id = 0;
  node.width = 0;
  node.height = 0;
  return node;
}

type InputsBase = {
  [key: string]: {
    type: string;
    label: string;
    props?: {
      [key: string]: any;
    };
  } & (
    | {
        fields: [
          {
            value: any;
          }
        ];
      }
    | {
        array: true;
        fields: {
          value: any;
        }[];
      }
  );
};
type NodeBase<T extends InputsBase> = {
  x: number;
  y: number;
  title: string;
  inputs: T;
  output: {
    type: string;
    label: string;
    props?: {
      [key: string]: any;
    };
  };
  function: (inputs: { [K in keyof T]: any }) => Promise<any> | any;
};

type Field = {
  value: any; // depends on type
  cx: number; // relative to node
  cy: number; // relative to node
  ref: HTMLDivElement;
};
export type InputField = Field & {
  from: number | null;
};

export type NodeCommon = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  inputs: {
    [key: string]: {
      type: string;
      label: string;
      array: boolean;
      fields: InputField[];
      props?: {
        [key: string]: any;
      };
    };
  };
  output: {
    type: string;
    label: string;
    field: Field;
    props?: {
      [key: string]: any;
    };
  };
  /// should match inputs and output, prob not possible to type
  function: (inputs: any) => any;
};
