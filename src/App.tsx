import { Panels } from "./components/Panels";
import { NodesContextProvider } from "./components/context/NodesContext";

function App() {
  return (
    <div class="flex flex-col h-screen">
      <div class="flex gap-4">
        <h1>qrnodes</h1>
        <a href="https://github.com/zhengkyl/qrnodes">source code</a>
      </div>
      <NodesContextProvider>
        <Panels />
      </NodesContextProvider>
    </div>
  );
}

export default App;
