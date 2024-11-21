import { Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { unwrap } from "solid-js/store";
import { NODE_DEFS } from "./nodes/factory";

export function Details() {
  const { nodes, activeIds } = useNodesContext();

  return (
    <div class="w-full h-full p-2 overflow-y-auto break-words whitespace-break-spaces">
      <Show when={activeIds().length}>
        {prettyOutput(nodes[activeIds()[0]]!)}
      </Show>
    </div>
  );
}

const TypedArray = Object.getPrototypeOf(Uint8Array);

const prettyOutput = (node) => {
  if (NODE_DEFS[node.key].outputDef.type === "display") {
    return node.output.value;
  }
  return prettyPrint(unwrap(node.output.value));
};

const prettyPrint = (arg) => {
  if (arg == null) return arg;
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
