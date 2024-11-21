import { unwrap } from "solid-js/store";
import { Panels } from "./components/Panels";
import {
  NodesContextProvider,
  useNodesContext,
} from "./components/context/NodesContext";
import { batch } from "solid-js";

function AppWithContext() {
  const { nodes, setNodes, setActiveIds } = useNodesContext();
  return (
    <div class="flex flex-col h-screen">
      <div class="flex gap-4">
        <h1>qrnodes</h1>
        <a href="https://github.com/zhengkyl/qrnodes">source code</a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(unwrap(nodes)));
          }}
        >
          copy state
        </button>
        <button
          onClick={async () => {
            const jsonNodes = await navigator.clipboard.readText();
            batch(() => {
              setActiveIds([]);
              setNodes(JSON.parse(jsonNodes));
            });
          }}
        >
          load state from clipboard
        </button>
      </div>
      <Panels />
    </div>
  );
}

function App() {
  return (
    <NodesContextProvider>
      <AppWithContext />
    </NodesContextProvider>
  );
}

export default App;
