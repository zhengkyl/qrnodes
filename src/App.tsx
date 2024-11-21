import { unwrap } from "solid-js/store";
import { Panels } from "./components/Panels";
import {
  NodesContextProvider,
  useNodesContext,
} from "./components/context/NodesContext";
import { batch } from "solid-js";

function AppWithContext() {
  const { nodes, setNodes, setActiveIds } = useNodesContext();
  let input;
  return (
    <div class="flex flex-col h-screen">
      <div class="flex gap-4">
        <h1>qrnodes</h1>
        <a href="https://github.com/zhengkyl/qrnodes">source code</a>
        <button
          onClick={() => {
            const cleanNodes = unwrap(nodes);
            let currNode;
            let currOutput;
            let currInputs;
            let currField;
            navigator.clipboard.writeText(
              JSON.stringify(cleanNodes, function (key, v) {
                if (this === cleanNodes) {
                  currNode = v;
                  return v;
                } else if (this === currNode) {
                  switch (key) {
                    case "width":
                    case "height":
                      return 0;
                    case "inputs":
                      currInputs = v;
                      return v;
                    case "output":
                      currOutput = v;
                      return v;
                  }
                } else if (this === currInputs) {
                  currField = v;
                  return v;
                } else if (this === currField || this === currOutput) {
                  switch (key) {
                    case "cx":
                    case "cy":
                      return 0;
                    case "ref":
                      return null;
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
            setNodes(JSON.parse(input.value));
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
