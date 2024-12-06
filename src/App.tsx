import { unwrap } from "solid-js/store";
import { Panels } from "./components/Panels";
import {
  NodesContextProvider,
  useNodesContext,
} from "./components/context/NodesContext";
import { batch } from "solid-js";
import type { NodeInfo } from "./components/nodes/shared";

function AppWithContext() {
  const { nodes, setNodes, setActiveIds, setNextNodeId, displayId } =
    useNodesContext();

  const downloadSvg = async () => {
    const url = URL.createObjectURL(
      new Blob([nodes[displayId()!]!.output.value], {
        type: "image/svg+xml",
      })
    );
    download(url, `qrnodes.svg`);
    URL.revokeObjectURL(url);
  };

  let input;
  return (
    <div class="flex flex-col h-screen">
      <div class="flex gap-4 px-2">
        <h1>qrnodes</h1>
        <a href="https://github.com/zhengkyl/qrnodes">source code</a>
        <button
          onClick={() => {
            const condensed = unwrap(nodes).filter((node) => node != null);
            let currNode;
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
              node.output = {};
              expanded[node.id] = node;
            });
            setNodes(expanded);
            setNextNodeId(maxId + 1);
            input.value = "";
          }}
        >
          load state
        </button>
        <button
          class="ml-auto disabled:opacity-50"
          onClick={downloadSvg}
          disabled={displayId() == null}
        >
          download
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

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
