import { createSignal } from "solid-js";
import {
  NodesContextProvider,
  useNodesContext,
} from "./components/context/NodesContext";
import { LoadProjectModal } from "./components/LoadProjectModal";
import { Panels } from "./components/Panels";
import { SaveProjectModal } from "./components/SaveProjectModal";

function AppWithContext() {
  const {
    nodes,
    displayId,
    currentProjectName,
    saveState,
    loadState,
    getStateString,
    showSaveModal,
    setShowSaveModal,
  } = useNodesContext();

  const [showLoadModal, setShowLoadModal] = createSignal(false);

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
        <button onClick={saveState} disabled={currentProjectName() == null}>
          save {currentProjectName() ?? ""}
        </button>
        <button onClick={() => setShowSaveModal(true)}>save as</button>
        <button onClick={() => setShowLoadModal(true)}>load</button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(getStateString());
          }}
        >
          copy state
        </button>
        <input ref={input} placeholder="Paste state here..." />
        <button
          onClick={() => {
            loadState(JSON.parse(input.value));
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
      <SaveProjectModal open={showSaveModal()} setOpen={setShowSaveModal} />
      <LoadProjectModal open={showLoadModal()} setOpen={setShowLoadModal} />
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
