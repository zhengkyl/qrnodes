import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
  batch,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { NodeInfo } from "../nodes/shared";

export const NodesContext = createContext<{
  activeIds: Accessor<number[]>;
  setActiveIds: Setter<number[]>;
  nodes: (NodeInfo | null)[];
  addNode: (node: NodeInfo) => number;
  removeNodes: (ids: number[]) => void;
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
  const removeNodes = (ids: number[]) => {
    batch(() => {
      nodes.forEach((node) => {
        if (node == null) return;
        Object.entries(node.inputs).forEach(([key, input]) => {
          input.forEach((field, j) => {
            if (field.from != null && ids.includes(field.from)) {
              setNodes(node.id, "inputs", key, j, "from", null);
            }
          });
        });
      });
      ids.forEach((id) => {
        setNodes(id, null);
      });
      freeIds.push(...ids);
    });
  };

  const [activeIds, setActiveIds] = createSignal<number[]>([]);

  return (
    <NodesContext.Provider
      value={{
        activeIds,
        setActiveIds,
        nodes,
        addNode,
        removeNodes,
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
