import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";

export type Node = {
  x: number;
  y: number;
  focused: boolean;
  ref: any;
};

export const NodesContext = createContext<{
  selection: Accessor<Set<number>>;
  setSelection: Setter<Set<number>>;
  nodes: (Node | null)[];
  addNode: (node: Node) => void;
  removeNode: (id: number) => void;
  setNodes: SetStoreFunction<(Node | null)[]>;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  const [nodes, setNodes] = createStore<(Node | null)[]>([]);
  const freeIds: number[] = [];

  const addNode = (node) => {
    setNodes(freeIds.pop() ?? nodes.length, node);
  };
  const removeNode = (id) => {
    setNodes(id, null);
    freeIds.push(id);
  };

  const [selection, setSelection] = createSignal(new Set<number>(), {
    equals: false,
  });

  return (
    <NodesContext.Provider
      value={{ selection, setSelection, nodes, addNode, removeNode, setNodes }}
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
