import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
  batch,
  createMemo,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { NodeInfo } from "../nodes/shared";
import { NODE_DEFS } from "../nodes/factory";

export const NodesContext = createContext<{
  activeIds: Accessor<number[]>;
  setActiveIds: Setter<number[]>;
  displayId: Accessor<number | null>;
  nodes: (NodeInfo | null)[];
  addNode: (node: NodeInfo) => void;
  removeNodes: (ids: number[]) => void;
  setNodes: SetStoreFunction<(NodeInfo | null)[]>;
  nextNodeId: () => number;
  setNextNodeId: (next: number) => void;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  let nodeIdCount = 1;
  const nextNodeId = () => nodeIdCount++;
  const setNextNodeId = (next) => (nodeIdCount = next);

  const [nodes, setNodes] = createStore<(NodeInfo | null)[]>([]);
  const freeIds: number[] = [];

  const addNode = (node) => {
    setNodes(node.id, node);
  };

  const removeNodes = (ids: number[]) => {
    batch(() => {
      nodes.forEach((node) => {
        if (node == null) return;
        const inputsDef = NODE_DEFS[node.key].inputsDef;
        Object.entries(node.inputs).forEach(([key, input]) => {
          const removed: number[] = [];
          input.forEach((field, j) => {
            if (field.from != null && ids.includes(field.from)) {
              setNodes(node.id, "inputs", key, j, "from", null);
              removed.push(j);
            }
          });

          if (removed.length && inputsDef[key].array) {
            setNodes(node.id, "inputs", key, (prevFields) =>
              prevFields.filter((_, i) => !removed.includes(i))
            );
          }
        });
      });
      ids.forEach((id) => {
        setNodes(id, null);
      });
      freeIds.push(...ids);
    });
  };

  // TODO this is set on every selectmove event, need to dedupe
  const [activeIds, setActiveIds] = createSignal<number[]>([]);

  const displayId = createMemo((prev: number | null) => {
    const ids = activeIds();
    if (prev != null && nodes[prev] == null) {
      return null;
    }
    if (prev != null && ids.includes(prev)) return prev;
    for (const id of ids) {
      if (NODE_DEFS[nodes[id]!.key].outputDef.type === "display") {
        return id;
      }
    }
    return prev;
  }, null);

  return (
    <NodesContext.Provider
      value={{
        nextNodeId,
        setNextNodeId,
        activeIds,
        setActiveIds,
        displayId,
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
