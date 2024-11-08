import { Panels } from "./components/Panels";
import { NodesContextProvider } from "./components/context/NodesContext";

function App() {
  return (
    <div class="flex flex-col h-screen">
      <div>
        <h1>qrnodes</h1>
      </div>
      <NodesContextProvider>
        <Panels />
      </NodesContextProvider>
    </div>
  );
}

export default App;
