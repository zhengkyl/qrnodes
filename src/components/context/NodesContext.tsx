import {
  batch,
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
  type Setter,
} from "solid-js";
import { createStore, unwrap, type SetStoreFunction } from "solid-js/store";
import {
  deleteProject,
  getProject,
  setProject,
} from "../../utils/projectStorage";
import { NODE_DEFS } from "../nodes/factory";
import type { NodeInfo } from "../nodes/shared";

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
  currentProjectName: Accessor<string | null>;
  saveState: () => void;
  saveStateAs: (name: string) => void;
  loadStateFrom: (projectName: string) => void;
  loadState: (nodes: any[]) => void;
  getStateString: () => any;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  let nodeIdCount = 1;
  const nextNodeId = () => nodeIdCount++;
  const setNextNodeId = (next) => (nodeIdCount = next);

  const [nodes, setNodes] = createStore<(NodeInfo | null)[]>([]);
  const [currentProjectName, setCurrentProjectName] = createSignal<
    string | null
  >(null);

  const addNode = (node) => {
    setNodes(node.id, node);
  };

  const removeNodes = (ids: number[]) => {
    batch(() => {
      ids.forEach((id) => {
        setNodes(id, null);
      });
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

  const getStateString = () => {
    const condensed = unwrap(nodes).filter((node) => node != null);
    let currNode;
    let currInputs;
    let currInputArray;
    let currInputArrayItem;

    return JSON.stringify(condensed, function (key, v) {
      if (this === condensed) {
        currNode = v;
        return v;
      } else if (this === currNode) {
        switch (key) {
          case "width":
          case "height":
          case "output":
            return undefined;
          case "inputs":
            currInputs = v;
            return v;
        }
      } else if (this === currInputs) {
        currInputArray = v;
        return v;
      } else if (this === currInputArray) {
        currInputArrayItem = v;
        return v;
      } else if (this === currInputArrayItem) {
        switch (key) {
          case "cx":
          case "cy":
          case "ref":
            return undefined;
        }
      }

      if (typeof v === "number") {
        return Number.isInteger(v) ? v : Number(v.toFixed(3));
      }
      return v;
    });
  };

  const saveStateAs = async (name: string) => {
    setProject(name, getStateString());
    setCurrentProjectName(name);
  };
  const saveState = async () => {
    const curr = currentProjectName();
    if (curr == null) return;
    setProject(curr, getStateString());
  };

  const loadStateFrom = async (projectName: string) => {
    const saved = getProject(projectName);
    if (!saved) {
      return;
    }
    loadState(JSON.parse(saved));
    setCurrentProjectName(projectName);
  };

  const loadState = (nodes: any[]) => {
    batch(() => {
      setActiveIds([]);
      setNodes([]);
    });
    const expanded: NodeInfo[] = [];
    let maxId = 0;
    nodes.forEach((node) => {
      if (node.id > maxId) maxId = node.id;
      node.output = {};
      expanded[node.id] = node;
    });
    setNodes(expanded);
    setNextNodeId(maxId + 1);
  };

  onMount(() => {
    // Check for auto-saved data on mount
    const saved = getProject("autosave");
    if (!saved) return;

    const shouldRecover = confirm(
      `HMR Auto-saved data found. Would you like to recover it?`
    );

    if (shouldRecover) {
      loadState(JSON.parse(saved));
    }

    deleteProject("autosave");

    // Set up HMR auto-save listener and recovery
    const handleHMRAutoSave = (event: CustomEvent) => {
      console.log("🔥 HMR Auto-save triggered by:", event.detail);
      saveStateAs("autosave");
    };

    window.addEventListener("hmr:autosave", handleHMRAutoSave as EventListener);
    onCleanup(() => {
      window.removeEventListener(
        "hmr:autosave",
        handleHMRAutoSave as EventListener
      );
    });
  });

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
        currentProjectName,
        saveState,
        saveStateAs,
        loadState,
        loadStateFrom,
        getStateString,
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
