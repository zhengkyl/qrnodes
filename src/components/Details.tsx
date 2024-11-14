import { Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { unwrap } from "solid-js/store";

export function Details() {
  const { nodes, activeIds } = useNodesContext();

  return (
    <div class="w-full h-full p-2 overflow-scroll break-words">
      <Show when={activeIds().length}>
        {prettyPrint(unwrap(nodes[activeIds()[0]]!.output.value))}
      </Show>
    </div>
  );
}

const TypedArray = Object.getPrototypeOf(Uint8Array);

const prettyPrint = (arg) => {
  if (arg == null) return null;
  switch (typeof arg) {
    case "object": {
      if (arg instanceof TypedArray) {
        return `[${arg.map((a) => a.toString()).join(",")}]`;
      }

      if (Array.isArray(arg)) {
        return JSON.stringify(arg);
      }

      let s = "{";
      Object.entries(arg).forEach(([key, value]) => {
        s += " ";
        s += key;
        s += ": ";
        s += prettyPrint(value);
        s += ",";
      });
      return s + "}";
    }
    default: {
      return JSON.stringify(arg);
    }
  }
};
