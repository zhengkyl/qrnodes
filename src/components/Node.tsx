import { toDom } from "hast-util-to-dom";
import {
  batch,
  createEffect,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { useCanvasContext } from "./Canvas";
import { useNodesContext, type NodeCommon } from "./context/NodesContext";
import { NumberInput } from "./ui/NumberInput";
import { ResizingTextInput, TextInput } from "./ui/TextInput";
import { Select } from "./ui/Select";

type NodeProps = NodeCommon;

const R_SQUARED = 40 * 40;

export function Node(props: NodeProps) {
  const {
    canvasScale,
    toCanvasCoords,
    setHandleCoords,
    setGhostHead,
    setGhostTail,
    preview,
  } = useCanvasContext();
  const { nodes, setNodes, activeIds } = useNodesContext();

  onMount(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize[0].inlineSize;
        const height = entry.borderBoxSize[0].blockSize;

        setNodes(props.id, { width, height });

        Object.keys(props.inputs).forEach((key, i) => {
          const handle = inputHandleRefs[i].getBoundingClientRect();
          const { x, y } = toCanvasCoords(
            handle.x + handle.width / 2,
            handle.y + handle.height / 2
          );
          setNodes(props.id, "inputs", key, {
            cx: x - props.x,
            cy: y - props.y,
          });
        });

        if (outputHandleRef == null) return;
        const handle = outputHandleRef.getBoundingClientRect();
        const { x, y } = toCanvasCoords(
          handle.x + handle.width / 2,
          handle.y + handle.height / 2
        );
        setNodes(props.id, "output", {
          cx: x - props.x,
          cy: y - props.y,
        });
      }
    });

    observer.observe(nodeRef);
  });

  let nodeRef: HTMLDivElement;
  const inputHandleRefs: HTMLDivElement[] = [];
  let outputHandleRef: HTMLDivElement;

  const onPointerDownTail = (
    fromId: number,
    oldToPath: [number, string] | null
  ) => {
    const validNodes: {
      cx: number;
      cy: number;
      path: [number, string];
    }[] = [];

    nodes.forEach((node) => {
      if (node == null) return;
      if (node.id == fromId) return;
      const entries = Object.entries(node.inputs);

      entries.forEach(([key, input]) => {
        if (input.from != null) return;
        if (input.type !== nodes[fromId]!.output.type) return;
        validNodes.push({
          cx: node.x + input.cx,
          cy: node.y + input.cy,
          path: [node.id, key],
        });
      });
    });

    const onMoveTail = (e: PointerEvent) => {
      let toPath: [number, string] | null = null;
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setHandleCoords(coords);
      const overlaps: {
        dist: number;
        path: [number, string];
      }[] = [];
      validNodes.forEach((node) => {
        const dx = coords.x - node.cx;
        const dy = coords.y - node.cy;
        const d2 = dx * dx + dy * dy;

        const ignoringFirst =
          oldToPath &&
          node.path[0] === oldToPath![0] &&
          node.path[1] === oldToPath![1];
        if (d2 < R_SQUARED) {
          if (!ignoringFirst) {
            overlaps.push({ dist: d2, path: node.path });
          }
        } else if (ignoringFirst) {
          oldToPath = null;
        }
      });

      if (overlaps.length) {
        for (let i = 1; i < overlaps.length; i++) {
          if (overlaps[i].dist < overlaps[0].dist) {
            overlaps[0].dist = overlaps[i].dist;
            overlaps[0].path = overlaps[i].path;
          }
        }
        const newPath = overlaps[0].path;
        if (
          toPath != null &&
          toPath[0] === newPath[0] &&
          toPath[1] === newPath[1]
        ) {
          return;
        }
        toPath = newPath;
        setGhostTail(toPath);
        setNodes(toPath[0], "inputs", toPath[1], "from", fromId);
      } else {
        if (toPath == null) return;
        setGhostTail(null);
        setNodes(toPath[0], "inputs", toPath[1], "from", null);
        toPath = null;
      }
    };

    const onReleaseTail = () => {
      document.removeEventListener("pointermove", onMoveTail);
      document.removeEventListener("pointerup", onReleaseTail);
      batch(() => {
        setGhostHead(null);
        setGhostTail(null);
      });
    };

    document.addEventListener("pointermove", onMoveTail);
    document.addEventListener("pointerup", onReleaseTail);
  };

  const onPointerDownHead = (key, input) => (e) => {
    e.stopImmediatePropagation();
    const coords = toCanvasCoords(e.clientX, e.clientY);
    setHandleCoords(coords);

    let fromId = input.from;
    if (fromId != null) {
      setGhostHead(fromId);
      setNodes(props.id, "inputs", key, "from", null);
      onPointerDownTail(fromId, [props.id, key]);
    } else {
      const toPath = [props.id, key] as [number, string];
      setGhostTail(toPath);

      // TODO depth list
      const validHeadSlots = nodes.filter(
        (node) =>
          node != null &&
          node.id !== props.id &&
          node.output.type === input.type
      ) as NodeCommon[];

      const onMoveHead = (e: PointerEvent) => {
        const coords = toCanvasCoords(e.clientX, e.clientY);
        setHandleCoords(coords);

        const overlaps: { dist: number; id: number }[] = [];
        validHeadSlots.forEach((node) => {
          const cx = node.x + node.output.cx;
          const cy = node.y + node.output.cy;

          const dx = coords.x - cx;
          const dy = coords.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < R_SQUARED) {
            overlaps.push({ dist: d2, id: node.id });
          }
        });

        if (overlaps.length) {
          for (let i = 1; i < overlaps.length; i++) {
            if (overlaps[i].dist < overlaps[0].dist) {
              overlaps[0].dist = overlaps[i].dist;
              overlaps[0].id = overlaps[i].id;
            }
          }
          let newId = overlaps[0].id;
          if (fromId === newId) return;
          fromId = newId;
          setGhostHead(fromId);
          setNodes(props.id, "inputs", key, "from", fromId);
        } else {
          if (fromId == null) return;
          fromId = null;
          setGhostHead(null);
          setNodes(props.id, "inputs", key, "from", null);
        }
      };
      const onReleaseHead = () => {
        document.removeEventListener("pointermove", onMoveHead);
        document.removeEventListener("pointerup", onReleaseHead);
        batch(() => {
          setGhostHead(null);
          setGhostTail(null);
        });
      };

      document.addEventListener("pointermove", onMoveHead);
      document.addEventListener("pointerup", onReleaseHead);
    }
  };

  const outputValue = () => {
    // TODO validate preview value
    const inputs = {};
    Object.entries(props.inputs).forEach(([key, input]) => {
      if (input.from != null) {
        inputs[key] = nodes[input.from]!.output.value;
      } else {
        inputs[key] = input.value;
      }
    });
    const output = props.function(inputs);
    setNodes(props.id, "output", "value", output);

    if (props.output.type === "display") {
      console.log("display");
      if (output == null) return;
      preview().replaceChildren(toDom(output));
    }
    return output;
  };

  return (
    <div
      ref={nodeRef!}
      classList={{
        "absolute bg-back-subtle p-4 border": true,
      }}
      style={{
        translate: `${props.x}px ${props.y}px`,
      }}
    >
      <svg
        classList={{
          "absolute overflow-visible pointer-events-none": true,
          // TODO store active state somewhere?
          hidden: !activeIds().includes(props.id),
        }}
        style={{
          top: `${-1}px`,
          left: `${-1}px`,
          width: `${props.width}px`,
          height: `${props.height}px`,
        }}
      >
        <rect
          class="fill-none stroke-rose-500"
          width={props.width}
          height={props.height}
          stroke-width={2 / canvasScale()}
        />
      </svg>
      <div class="flex flex-col gap-4">
        <div class="select-none font-bold leading-none">{props.title}</div>
        <For each={Object.entries(props.inputs)}>
          {([key, input], i) => {
            return (
              <div>
                <div class="select-none text-sm">{input.label}</div>
                <div class="flex items-center">
                  <div
                    ref={inputHandleRefs[i()]}
                    class="absolute rounded-full -left-2 w-4 h-4 border bg-back-subtle"
                    onPointerDown={onPointerDownHead(key, input)}
                  ></div>
                  <Dynamic
                    component={INPUT_MAP[input.type] ?? TextInput}
                    value={
                      input.from != null
                        ? nodes[input.from!]!.output.value
                        : input.value
                    }
                    disabled={input.from != null}
                    onValue={(v) => {
                      setNodes(props.id, "inputs", key, "value", v);
                    }}
                    {...input.props}
                  />
                </div>
              </div>
            );
          }}
        </For>
        <div>
          <div class="select-none text-sm">{props.output.label}</div>
          <div class="flex items-center">
            <Show when={props.output.type !== "display"}>
              <div
                ref={outputHandleRef!}
                class="absolute -right-2 w-4 h-4 border bg-back-subtle"
                onPointerDown={(e) => {
                  e.stopImmediatePropagation();
                  const coords = toCanvasCoords(e.clientX, e.clientY);
                  setHandleCoords(coords);

                  setGhostHead(props.id);
                  onPointerDownTail(props.id, null);
                }}
              ></div>
            </Show>
            <Show
              when={Object.keys(props.inputs).length}
              fallback={
                <Dynamic
                  component={INPUT_MAP[props.output.type]}
                  value={props.output.value}
                  onValue={(v) => {
                    setNodes(props.id, "output", "value", v);
                  }}
                  {...props.output.props}
                />
              }
            >
              <Switch fallback={<TextInput value={outputValue()} disabled />}>
                <Match when={props.output.type === "display"}>
                  <DisplayOutput output={outputValue()} />
                </Match>
              </Switch>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayOutput(props) {
  let ref: HTMLDivElement;
  createEffect(() => {
    if (props.output == null) {
      ref.replaceChildren();
    } else {
      ref.replaceChildren(toDom(props.output));
    }
  });
  return <div ref={ref!} class="h-full w-full aspect-1/1 checkerboard"></div>;
}

const INPUT_MAP = {
  string: ResizingTextInput,
  number: NumberInput,
  select: Select,
};
