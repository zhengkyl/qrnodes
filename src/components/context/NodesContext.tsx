import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
  batch,
  createMemo,
  onMount,
  onCleanup,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { NodeInfo } from "../nodes/shared";
import { NODE_DEFS } from "../nodes/factory";
import { saveProject, loadProject, type SavedProject } from "../../utils/projectStorage";

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
  saveState: (name: string, description?: string) => Promise<string>;
  saveCurrentState: () => Promise<boolean>;
  loadState: (projectName: string) => Promise<boolean>;
  getStateForSaving: () => any;
}>();

export function NodesContextProvider(props: { children: JSX.Element }) {
  let nodeIdCount = 1;
  const nextNodeId = () => nodeIdCount++;
  const setNextNodeId = (next) => (nodeIdCount = next);

  const [nodes, setNodes] = createStore<(NodeInfo | null)[]>([]);
  const [currentProjectName, setCurrentProjectName] = createSignal<string | null>(null);

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

  const getStateForSaving = () => {
    return {
      nodes: nodes.filter(node => node != null).map(node => {
        const { width, height, output, cx, cy, ref, ...rest } = node;
        return rest;
      }),
      nextNodeId: nodeIdCount
    };
  };

  const saveState = async (name: string, description?: string): Promise<string> => {
    try {
      const state = getStateForSaving();
      const projectId = saveProject(name, state, description);
      setCurrentProjectName(name);
      clearAutoSave(); // Clear auto save after successful project save
      return projectId;
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  };

  const saveCurrentState = async (): Promise<boolean> => {
    try {
      const projectName = currentProjectName();
      
      if (!projectName) {
        return false; // No current project to save to
      }
      
      const state = getStateForSaving();
      saveProject(projectName, state);
      return true;
    } catch (error) {
      console.error('Failed to save current state:', error);
      return false;
    }
  };

  const loadState = async (projectName: string): Promise<boolean> => {
    try {
      const project = loadProject(projectName);
      if (!project) {
        return false;
      }

      const { nodes: loadedNodes, nextNodeId: loadedNextNodeId } = project.state;
      
      batch(() => {
        setNodes([]);
        setActiveIds([]);
        
        if (loadedNodes && Array.isArray(loadedNodes)) {
          loadedNodes.forEach((node: NodeInfo) => {
            if (node && typeof node.id === 'number') {
              node.output = {};
              setNodes(node.id, node);
            }
          });
        }
        
        if (typeof loadedNextNodeId === 'number') {
          setNextNodeId(loadedNextNodeId);
        }
        
        setCurrentProjectName(projectName);
        clearAutoSave(); // Clear auto save after successful project load
      });
      
      return true;
    } catch (error) {
      console.error('Failed to load state:', error);
      return false;
    }
  };

  // Helper function to clear auto save data
  const clearAutoSave = () => {
    try {
      localStorage.removeItem('qrnodes_hmr_auto_save');
      console.log('🧹 Auto-save data cleared');
    } catch (error) {
      console.error('Failed to clear auto-save:', error);
    }
  };

  // Auto-save functionality for HMR
  const performAutoSave = () => {
    try {
      // Only auto-save if there are nodes to save
      const currentNodes = nodes.filter(node => node != null);
      if (currentNodes.length === 0) {
        console.log('🔄 HMR Auto-save: No nodes to save');
        return;
      }

      const state = getStateForSaving();
      const autoSaveData = {
        state,
        timestamp: new Date().toISOString(),
        type: 'hmr-auto-save',
        nodeCount: currentNodes.length
      };
      
      localStorage.setItem('qrnodes_hmr_auto_save', JSON.stringify(autoSaveData));
      console.log(`💾 HMR Auto-saved: ${currentNodes.length} nodes at ${autoSaveData.timestamp}`);
    } catch (error) {
      console.error('❌ HMR Auto-save failed:', error);
    }
  };

  // Set up HMR auto-save listener and recovery
  onMount(() => {
    const handleHMRAutoSave = (event: CustomEvent) => {
      console.log('🔥 HMR Auto-save triggered by:', event.detail);
      performAutoSave();
    };

    window.addEventListener('hmr:autosave', handleHMRAutoSave as EventListener);
    
    // Check for auto-saved data on mount
    try {
      const saved = localStorage.getItem('qrnodes_hmr_auto_save');
      if (saved) {
        const autoSaveData = JSON.parse(saved);
        const timeDiff = Date.now() - new Date(autoSaveData.timestamp).getTime();
        
        // If auto-save is less than 5 minutes old and we have no current nodes, offer recovery
        const currentNodes = nodes.filter(node => node != null);
        if (timeDiff < 5 * 60 * 1000 && currentNodes.length === 0 && autoSaveData.nodeCount > 0) {
          const shouldRecover = confirm(
            `HMR Auto-saved data found from ${new Date(autoSaveData.timestamp).toLocaleString()}\n` +
            `Contains ${autoSaveData.nodeCount} nodes. Would you like to recover it?`
          );
          
          if (shouldRecover) {
            const { nodes: loadedNodes, nextNodeId: loadedNextNodeId } = autoSaveData.state;
            
            batch(() => {
              if (loadedNodes && Array.isArray(loadedNodes)) {
                loadedNodes.forEach((node: NodeInfo) => {
                  if (node && typeof node.id === 'number') {
                    node.output = {};
                    setNodes(node.id, node);
                  }
                });
              }
              
              if (typeof loadedNextNodeId === 'number') {
                setNextNodeId(loadedNextNodeId);
              }
            });
            
            console.log(`🔄 Recovered ${loadedNodes?.length || 0} nodes from HMR auto-save`);
          }
          
          // Clear auto save data regardless of user choice to prevent repeated prompts
          clearAutoSave();
        }
      }
    } catch (error) {
      console.error('❌ HMR Auto-recovery failed:', error);
    }
    
    onCleanup(() => {
      window.removeEventListener('hmr:autosave', handleHMRAutoSave as EventListener);
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
        saveCurrentState,
        loadState,
        getStateForSaving,
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
