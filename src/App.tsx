import { unwrap } from "solid-js/store";
import { Panels } from "./components/Panels";
import {
  NodesContextProvider,
  useNodesContext,
} from "./components/context/NodesContext";
import { batch } from "solid-js";
import type { NodeInfo } from "./components/nodes/shared";

function AppWithContext() {
  const { nodes, setNodes, setActiveIds, setNextNodeId } = useNodesContext();
  let input;
  return (
    <div class="flex flex-col h-screen">
      <div class="flex gap-4">
        <h1>qrnodes</h1>
        <a href="https://github.com/zhengkyl/qrnodes">source code</a>
        <button
          onClick={() => {
            const condensed = unwrap(nodes).filter((node) => node != null);
            let currNode;
            let currOutput;
            let currInputs;
            let currInputArray;
            let currInputArrayItem;
            navigator.clipboard.writeText(
              JSON.stringify(condensed, function (key, v) {
                if (this === condensed) {
                  currNode = v;
                  return v;
                } else if (this === currNode) {
                  switch (key) {
                    case "width":
                    case "height":
                      return undefined;
                    case "inputs":
                      currInputs = v;
                      return v;
                    case "output":
                      currOutput = v;
                      return v;
                  }
                } else if (this === currInputs) {
                  currInputArray = v;
                  return v;
                } else if (this === currInputArray) {
                  currInputArrayItem = v;
                  return v;
                } else if (this === currInputArrayItem || this === currOutput) {
                  switch (key) {
                    case "cx":
                    case "cy":
                    case "ref":
                      return undefined;
                    case "value": {
                      return this === currOutput &&
                        Object.keys(currNode.inputs).length
                        ? null
                        : v;
                    }
                  }
                }

                if (typeof v === "number") {
                  return Number.isInteger(v) ? v : Number(v.toFixed(2));
                }
                return v;
              })
            );
          }}
        >
          copy state
        </button>
        <input ref={input} placeholder="Paste state here..." />
        <button
          onClick={() => {
            batch(() => {
              setActiveIds([]);
              setNodes([]);
            });
            const condensed = JSON.parse(input.value);
            const expanded: NodeInfo[] = [];
            let maxId = 0;
            condensed.forEach((node) => {
              if (node.id > maxId) maxId = node.id;
              expanded[node.id] = node;
            });
            setNodes(expanded);
            setNextNodeId(maxId + 1);
            input.value = "";
          }}
        >
          load state
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
