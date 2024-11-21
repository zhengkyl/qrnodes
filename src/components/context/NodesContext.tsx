import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { NodeInfo } from "../nodes/shared";

export const NodesContext = createContext<{
  activeIds: Accessor<number[]>;
  setActiveIds: Setter<number[]>;
  nodes: (NodeInfo | null)[];
  addNode: (node: NodeInfo) => number;
  removeNode: (id: number) => void;
  setNodes: SetStoreFunction<(NodeInfo | null)[]>;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  const [nodes, setNodes] = createStore<(NodeInfo | null)[]>([]);
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
