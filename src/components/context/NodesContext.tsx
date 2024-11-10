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
  Object.values(node.inputs).forEach((input) => {
    input.from = null;
    input.cx = 0;
    input.cy = 0;
  });

  node.output.value = null;
  node.output.cx = 0;
  node.output.cy = 0;

  node.id = 0;
  node.width = 0;
  node.height = 0;
  return node;
}

type InputsBase = {
  [key: string]: {
    type: string;
    label: string;
    value: any; // depends on type
  };
};
type NodeBase<T extends InputsBase> = {
  x: number;
  y: number;
  title: string;
  inputs: T;
  output: {
    type: string;
    label: string;
  };
  function: (inputs: { [K in keyof T]: any }) => Promise<any> | any;
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
      value: any; // depends on type
      from: null | number;
      cx: number; // relative to node
      cy: number; // relative to node
      // [key: string]: any;
    };
  };
  output: {
    type: string;
    label: string;
    value: any; // depends on type
    cx: number; // relative to node
    cy: number; // relative to node
    // ids: number[]
  };
  /// should match inputs and output, prob not possible to type
  function: (inputs: any) => any;
};
