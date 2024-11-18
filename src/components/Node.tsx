import { batch, For, Match, onMount, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useCanvasContext } from "./Canvas";
import { useNodesContext, type NodeCommon } from "./context/NodesContext";
import { NumberInput } from "./ui/NumberInput";
import { ResizingTextInput, TextInput } from "./ui/TextInput";
import { Select } from "./ui/Select";
import { unwrap } from "solid-js/store";
import { equal } from "../util/path";

type NodeProps = NodeCommon;

const R_SQUARED = 20 * 20;

export type InputPathKey = [number, string, number];

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
    const updateHandlePos = (ref, partialPath) => {
      const handle = ref.getBoundingClientRect();
      const { x, y } = toCanvasCoords(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2
      );
      // @ts-expect-error
      setNodes(props.id, ...partialPath, {
        cx: x - props.x,
        cy: y - props.y,
      });
    };
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize[0].inlineSize;
        const height = entry.borderBoxSize[0].blockSize;

        setNodes(props.id, { width, height });

        Object.entries(props.inputs).forEach(([key, input], i) => {
          for (let j = 0; j < input.fields.length; j++) {
            updateHandlePos(inputHandles[i][j], ["inputs", key, "fields", j]);
          }
        });

        if (outputHandle != null) {
          updateHandlePos(outputHandle, ["output", "field"]);
        }
      }
    });

    observer.observe(nodeRef);
  });

  let nodeRef: HTMLDivElement;
  const inputHandles: HTMLDivElement[][] = [];
  let outputHandle: HTMLDivElement;

  const onPointerDownTail = (
    fromId: number,
    oldToPath: InputPathKey | null
  ) => {
    const validType = nodes[fromId]!.output.type;
    const validInputs: {
      cx: number;
      cy: number;
      path: InputPathKey;
    }[] = [];

    nodes.forEach((node) => {
      if (node == null) return;
      if (node.id == fromId) return;
      const entries = Object.entries(node.inputs);

      entries.forEach(([key, input]) => {
        if (input.type !== validType) return;
        input.fields.forEach((field, j) => {
          if (field.from != null) return;
          validInputs.push({
            cx: node.x + field.cx,
            cy: node.y + field.cy,
            path: [node.id, key, j],
          });
        });
      });
    });

    const onMoveTail = (e: PointerEvent) => {
      let toPath: InputPathKey | null = null;
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setHandleCoords(coords);
      const overlaps: {
        dist: number;
        path: InputPathKey;
      }[] = [];
      validInputs.forEach((input) => {
        const dx = coords.x - input.cx;
        const dy = coords.y - input.cy;
        const d2 = dx * dx + dy * dy;

        const isOldPath = oldToPath && equal(input.path, oldToPath);
        if (d2 < R_SQUARED) {
          if (!isOldPath) {
            overlaps.push({ dist: d2, path: input.path });
          }
        } else if (isOldPath) {
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
        if (toPath != null && equal(toPath, newPath)) {
          return;
        }
        toPath = newPath;
        setGhostTail(toPath);
        setNodes(
          toPath[0],
          "inputs",
          toPath[1],
          "fields",
          toPath[2],
          "from",
          fromId
        );
      } else {
        if (toPath == null) return;
        setGhostTail(null);
        setNodes(
          toPath[0],
          "inputs",
          toPath[1],
          "fields",
          toPath[2],
          "from",
          null
        );
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

  const onPointerDownHead = (path: InputPathKey, field) => (e) => {
    e.preventDefault(); // don't trigger img drag
    e.stopImmediatePropagation();
    const coords = toCanvasCoords(e.clientX, e.clientY);
    setHandleCoords(coords);

    let fromId = field.from;
    if (fromId != null) {
      setGhostHead(fromId);
      setNodes(path[0], "inputs", path[1], "fields", path[2], "from", null);
      onPointerDownTail(fromId, path);
    } else {
      setGhostTail(path);

      // TODO depth list
      const validHeadSlots = nodes.filter(
        (node) =>
          node != null &&
          node.id !== props.id &&
          node.output.type === field.type
      ) as NodeCommon[];

      const onMoveHead = (e: PointerEvent) => {
        const coords = toCanvasCoords(e.clientX, e.clientY);
        setHandleCoords(coords);

        const overlaps: { dist: number; id: number }[] = [];
        validHeadSlots.forEach((node) => {
          const cx = node.x + node.output.field.cx;
          const cy = node.y + node.output.field.cy;

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
          setNodes(
            path[0],
            "inputs",
            path[1],
            "fields",
            path[2],
            "from",
            fromId
          );
        } else {
          if (fromId == null) return;
          fromId = null;
          setGhostHead(null);
          setNodes(path[0], "inputs", path[1], "fields", path[2], "from", null);
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
    const inputs = {};
    Object.entries(props.inputs).forEach(([key, input]) => {
      if (input.array) {
        inputs[key] = [];
        input.fields.forEach((field, j) => {
          if (field.from != null) {
            inputs[key][j] = nodes[field.from]!.output.field.value;
          } else {
            inputs[key][j] = field.value;
          }
        });
      } else {
        input.fields.forEach((field) => {
          if (field.from != null) {
            inputs[key] = nodes[field.from]!.output.field.value;
          } else {
            inputs[key] = field.value;
          }
        });
      }
      inputs[key] = unwrap(inputs[key]);
    });
    console.log(inputs);
    const output = props.function(inputs);
    setNodes(props.id, "output", "field", "value", output);

    if (props.output.type === "display") {
      if (output == null) return null;
      preview().innerHTML = output;
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
            inputHandles[i()] = [];
            return (
              <div>
                <div class="select-none text-sm">{input.label}</div>
                <For each={input.fields}>
                  {(field, j) => {
                    return (
                      <div class="flex items-center">
                        <div
                          ref={inputHandles[i()][j()]}
                          class="absolute -left-4 w-8 h-8"
                          onPointerDown={onPointerDownHead(
                            [props.id, key, j()],
                            field
                          )}
                        >
                          <div class="border rounded-full bg-back-subtle m-2 w-4 h-4"></div>
                        </div>
                        <Dynamic
                          component={INPUT_MAP[input.type] ?? TextInput}
                          value={
                            field.from != null
                              ? nodes[field.from!]!.output.field.value
                              : field.value
                          }
                          disabled={field.from != null}
                          onValue={
                            field.from != null
                              ? null
                              : (v) => {
                                  setNodes(
                                    props.id,
                                    "inputs",
                                    key,
                                    "fields",
                                    j(),
                                    "value",
                                    v
                                  );
                                }
                          }
                          {...input.props}
                        />
                      </div>
                    );
                  }}
                </For>
              </div>
            );
          }}
        </For>
        <div>
          <div class="select-none text-sm">{props.output.label}</div>
          <div class="flex items-center">
            <Show when={props.output.type !== "display"}>
              <div
                ref={outputHandle!}
                class="absolute -right-4 w-8 h-8"
                onPointerDown={(e) => {
                  e.preventDefault(); // don't trigger img drag
                  e.stopImmediatePropagation();
                  const coords = toCanvasCoords(e.clientX, e.clientY);
                  setHandleCoords(coords);

                  setGhostHead(props.id);
                  onPointerDownTail(props.id, null);
                }}
              >
                <div class="border bg-back-subtle m-2 w-4 h-4"></div>
              </div>
            </Show>
            <Show
              when={Object.keys(props.inputs).length}
              fallback={
                <Dynamic
                  component={INPUT_MAP[props.output.type]}
                  value={props.output.field.value}
                  onValue={(v) => {
                    setNodes(props.id, "output", "field", "value", v);
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
  return (
    <div
      class="h-full w-full aspect-1/1 checkerboard"
      innerHTML={props.output}
    ></div>
  );
}

const INPUT_MAP = {
  string: ResizingTextInput,
  number: NumberInput,
  select: Select,
};
