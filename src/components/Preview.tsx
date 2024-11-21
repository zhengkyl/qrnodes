import { useNodesContext } from "./context/NodesContext";

export function Preview() {
  const { nodes, displayId } = useNodesContext();
  return (
    <div
      class="h-full flex justify-center"
      innerHTML={displayId() != null ? nodes[displayId()!]!.output.value : null}
    ></div>
  );
}
