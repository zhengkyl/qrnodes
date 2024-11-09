import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";

export type NodeCommon = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  // nodeRef: HTMLElement | null;
  // outputRef: HTMLElement | null;
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
};

export const NodesContext = createContext<{
  activeIds: Accessor<number[]>;
  setActiveIds: Setter<number[]>;
  nodes: (NodeCommon | null)[];
  addNode: (node: Omit<NodeCommon, "id">) => number;
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
