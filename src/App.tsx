import { Panels } from "./components/Panels";
import { CanvasContextProvider } from "./components/context/CanvasContext";
import { NodesContextProvider } from "./components/context/NodesContext";

function App() {
  return (
    <div class="flex flex-col h-screen">
      <div>
        <h1>qrnodes</h1>
      </div>
      <CanvasContextProvider>
        <NodesContextProvider>
          <Panels />
        </NodesContextProvider>
      </CanvasContextProvider>
    </div>
  );
}

export default App;
