import { batch, For, Match, onMount, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useCanvasContext, type TailPath } from "./Canvas";
import { useNodesContext, type NodeCommon } from "./context/NodesContext";
import { NumberInput } from "./ui/NumberInput";
import { ResizingTextInput, TextInput } from "./ui/TextInput";
import { Select } from "./ui/Select";
import { unwrap } from "solid-js/store";
import { equal } from "../util/path";

type NodeProps = NodeCommon;

const R_SQUARED = 20 * 20;

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
          if (input.type === "array") {
            for (let j = 0; j < input.array.length; j++) {
              updateHandlePos(inputHandles[i][j], ["inputs", key, "array", j]);
            }
          } else {
            updateHandlePos(inputHandles[i], ["inputs", key]);
          }
        });

        if (outputHandle != null) {
          updateHandlePos(outputHandle, ["output"]);
        }
      }
    });

    observer.observe(nodeRef);
  });

  let nodeRef: HTMLDivElement;
  const inputHandles: (HTMLDivElement | HTMLDivElement[])[] = [];
  let outputHandle: HTMLDivElement;

  const onPointerDownTail = (fromId: number, oldToPath: TailPath | null) => {
    const validType = nodes[fromId]!.output.type;
    const validInputs: {
      cx: number;
      cy: number;
      path: TailPath;
    }[] = [];

    nodes.forEach((node) => {
      if (node == null) return;
      if (node.id == fromId) return;
      const entries = Object.entries(node.inputs);

      entries.forEach(([key, input]) => {
        if (input.type === "array") {
          input.array.forEach((item, j) => {
            if (item.from != null) return;
            if (item.type !== validType) return;
            validInputs.push({
              cx: node.x + item.cx,
              cy: node.y + item.cy,
              path: [node.id, "inputs", key, "array", j],
            });
          });
        } else {
          if (input.from != null) return;
          if (input.type !== validType) return;
          validInputs.push({
            cx: node.x + input.cx,
            cy: node.y + input.cy,
            path: [node.id, "inputs", key],
          });
        }
      });
    });

    const onMoveTail = (e: PointerEvent) => {
      let toPath: TailPath | null = null;
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setHandleCoords(coords);
      const overlaps: {
        dist: number;
        path: TailPath;
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
        // @ts-expect-error
        setNodes(...toPath, "from", fromId);
      } else {
        if (toPath == null) return;
        setGhostTail(null);
        // @ts-expect-error
        setNodes(...toPath, "from", null);
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

  const onPointerDownHead = (path, input) => (e) => {
    e.preventDefault(); // don't trigger img drag
    e.stopImmediatePropagation();
    const coords = toCanvasCoords(e.clientX, e.clientY);
    setHandleCoords(coords);

    let fromId = input.from;
    if (fromId != null) {
      setGhostHead(fromId);
      // @ts-expect-error
      setNodes(...path, "from", null);
      onPointerDownTail(fromId, path);
    } else {
      setGhostTail(path);

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
          // @ts-expect-error
          setNodes(...path, "from", fromId);
        } else {
          if (fromId == null) return;
          fromId = null;
          setGhostHead(null);
          // @ts-expect-error
          setNodes(...path, "from", null);
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
      if (input.type === "array") {
        inputs[key] = [];
        input.array.forEach((item, j) => {
          if (item.from != null) {
            inputs[key][j] = nodes[item.from]!.output.value;
          } else {
            inputs[key][j] = item.value;
          }
        });
      } else {
        if (input.from != null) {
          inputs[key] = nodes[input.from]!.output.value;
        } else {
          inputs[key] = input.value;
        }
      }
      unwrap(inputs[key]);
    });
    const output = props.function(inputs);
    setNodes(props.id, "output", "value", output);

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
            if (input.type === "array") {
              inputHandles[i()] = [];
              return (
                <div>
                  <div class="select-none text-sm">{input.label}</div>
                  <For each={input.array}>
                    {(item, j) => {
                      return (
                        <div class="flex items-center">
                          <div
                            ref={inputHandles[i()][j()]}
                            class="absolute -left-4 w-8 h-8"
                            onPointerDown={onPointerDownHead(
                              [props.id, "inputs", key, "array", j()],
                              item
                            )}
                          >
                            <div class="border rounded-full bg-back-subtle m-2 w-4 h-4"></div>
                          </div>
                          <Dynamic
                            component={INPUT_MAP[item.type] ?? TextInput}
                            value={
                              item.from != null
                                ? nodes[item.from!]!.output.value
                                : item.value
                            }
                            disabled={item.from != null}
                            onValue={
                              item.from != null
                                ? null
                                : (v) => {
                                    setNodes(
                                      props.id,
                                      "inputs",
                                      key,
                                      // @ts-expect-error
                                      "array",
                                      j(),
                                      "value",
                                      v
                                    );
                                  }
                            }
                            {...item.props}
                          />
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            }
            return (
              <div>
                <div class="select-none text-sm">{input.label}</div>
                <div class="flex items-center">
                  <div
                    // @ts-expect-error
                    ref={inputHandles[i()]}
                    class="absolute -left-4 w-8 h-8"
                    onPointerDown={onPointerDownHead(
                      [props.id, "inputs", key],
                      input
                    )}
                  >
                    <div class="border rounded-full bg-back-subtle m-2 w-4 h-4"></div>
                  </div>
                  <Dynamic
                    component={INPUT_MAP[input.type] ?? TextInput}
                    value={
                      input.from != null
                        ? nodes[input.from!]!.output.value
                        : input.value
                    }
                    disabled={input.from != null}
                    onValue={
                      input.from != null
                        ? null
                        : (v) => {
                            // @ts-expect-error
                            setNodes(props.id, "inputs", key, "value", v);
                          }
                    }
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
