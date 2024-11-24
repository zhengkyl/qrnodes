import { batch, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useCanvasContext } from "./Canvas";
import { useNodesContext } from "./context/NodesContext";
import { NumberInput } from "./ui/NumberInput";
import { ResizingTextInput, TextInput } from "./ui/TextInput";
import { Select } from "./ui/Select";
import { equal } from "../util/path";
import { produce, unwrap } from "solid-js/store";
import type { NodeDef, NodeInfo } from "./nodes/shared";
import { NODE_DEFS } from "./nodes/factory";

type NodeProps = NodeInfo;

const R_SQUARED = 20 * 20;

export type InputPathKey = [number, string, number];

export function Node(props: NodeProps) {
  const {
    canvasScale,
    toCanvasCoords,
    setHandleCoords,
    setGhostHead,
    setGhostTail,
  } = useCanvasContext();
  const { nodes, setNodes, activeIds } = useNodesContext();

  const nodeDef = NODE_DEFS[props.key] as NodeDef;

  let observer;
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
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize[0].inlineSize;
        const height = entry.borderBoxSize[0].blockSize;

        setNodes(props.id, { width, height });

        Object.entries(props.inputs).forEach(([key, input]) => {
          for (let j = 0; j < input.length; j++) {
            updateHandlePos(input[j].ref, ["inputs", key, j]);
          }
        });

        if (props.output.ref != null) {
          updateHandlePos(props.output.ref, ["output"]);
        }
      }
    });
    observer.observe(nodeRef);
  });
  onCleanup(() => {
    observer.unobserve(nodeRef);
  });

  let nodeRef: HTMLDivElement;

  const onPointerDownTail = (
    fromId: number,
    oldToPath: InputPathKey | null
  ) => {
    const validType = NODE_DEFS[nodes[fromId]!.key].outputDef.type;
    const validInputs: {
      cx: number;
      cy: number;
      path: InputPathKey;
    }[] = [];

    nodes.forEach((node) => {
      if (node == null) return;
      if (node.id == fromId) return;
      const inputsDef = NODE_DEFS[nodes[node.id]!.key].inputsDef;
      const entries = Object.entries(node.inputs);
      entries.forEach(([key, input]) => {
        if (inputsDef[key].type !== validType) return;
        input.forEach((field, j) => {
          if (field.from != null) return;
          validInputs.push({
            cx: node.x + field.cx,
            cy: node.y + field.cy,
            path: [node.id, key, j],
          });
        });
      });
    });

    let toPath: InputPathKey | null = null;
    let delToPath: InputPathKey | null = oldToPath;
    const onMoveTail = (e: PointerEvent) => {
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
        setNodes(toPath[0], "inputs", toPath[1], toPath[2], "from", fromId);
        const toNode = nodes[toPath[0]]!;
        const input = toNode.inputs[toPath[1]];
        const inputDef = NODE_DEFS[toNode.key].inputsDef[toPath[1]];
        if (inputDef.array && toPath[2] === input.length - 1) {
          setNodes(toPath[0], "inputs", toPath[1], toPath[2] + 1, {
            value: null,
          });
        }
      } else {
        if (toPath == null) return;
        setGhostTail(null);
        setNodes(toPath[0], "inputs", toPath[1], toPath[2], "from", null);
        delToPath = toPath;
        toPath = null;
      }
    };

    const onReleaseTail = () => {
      document.removeEventListener("pointermove", onMoveTail);
      document.removeEventListener("pointerup", onReleaseTail);
      batch(() => {
        setGhostHead(null);
        setGhostTail(null);

        if (toPath == null && delToPath != null) {
          const delNode = nodes[delToPath[0]]!;
          const input = delNode.inputs[delToPath[1]];
          const inputDef = NODE_DEFS[delNode.key].inputsDef[delToPath[1]];
          if (inputDef.array && input.length > 1) {
            setNodes(delToPath[0], "inputs", delToPath[1], (prevFields) =>
              prevFields.filter((_, i) => i !== delToPath![2])
            );
          }
        }
      });
    };

    document.addEventListener("pointermove", onMoveTail);
    document.addEventListener("pointerup", onReleaseTail);
  };

  const onPointerDownHead =
    (input, field, inputDef) => (e, path: InputPathKey) => {
      e.preventDefault(); // don't trigger img drag
      e.stopImmediatePropagation();
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setHandleCoords(coords);

      let fromId = field.from;
      if (fromId != null) {
        setGhostHead(fromId);
        setNodes(path[0], "inputs", path[1], path[2], "from", null);
        onPointerDownTail(fromId, path);
      } else {
        setGhostTail(path);

        // TODO depth list
        const validHeadSlots = nodes.filter(
          (node) =>
            node != null &&
            node.id !== props.id &&
            NODE_DEFS[node.key].outputDef.type === inputDef.type
        ) as NodeInfo[];

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
            setNodes(path[0], "inputs", path[1], path[2], "from", fromId);
            if (inputDef.array && path[2] === input.length - 1) {
              setNodes(path[0], "inputs", path[1], path[2] + 1, {
                value: null,
              });
            }
          } else {
            if (fromId == null) return;
            fromId = null;
            setGhostHead(null);
            setNodes(path[0], "inputs", path[1], path[2], "from", null);
            if (inputDef.array) {
              setNodes(path[0], "inputs", path[1], (prevFields) =>
                prevFields.filter((_, i) => i !== path[2] + 1)
              );
            }
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
    const unwrapNodes = unwrap(nodes);

    // TODO tracking doesn't work for objects that aren't set with produce
    // there aren't any nodes like that, but keep an eye out
    Object.entries(props.inputs).forEach(([key, input]) => {
      const inputDef = nodeDef.inputsDef[key];
      if (inputDef.array) {
        inputs[key] = [];
        input.forEach((field, j) => {
          // always one extra field to allow appending
          if (j === input.length - 1) return;
          if (field.from != null) {
            inputs[key][j] = unwrapNodes[field.from]!.output.value;
            nodes[field.from]!.output.value;
          } else {
            inputs[key][j] = unwrapNodes[props.id]!.inputs[key][j].value;
            field.value;
          }
        });
      } else {
        input.forEach((field, j) => {
          if (field.from != null) {
            inputs[key] = unwrapNodes[field.from]!.output.value;
            nodes[field.from]!.output.value;
          } else {
            inputs[key] = unwrapNodes[props.id]!.inputs[key][j].value;
            field.value;
          }
        });
      }
    });
    const output = nodeDef.function(inputs);
    setNodes(
      props.id,
      "output",
      produce((o) => (o.value = output))
    );

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
      <div class="flex flex-col gap-2">
        <div class="select-none font-bold leading-none pb-2">
          {nodeDef.title}
        </div>
        <For each={Object.entries(props.inputs)}>
          {([key, input]) => {
            const inputDef = nodeDef.inputsDef[key];
            return (
              <div>
                <div class="select-none text-sm leading-none pb-1">
                  {inputDef.label}
                </div>
                <For each={input}>
                  {(field, j) => {
                    const onPointerDown = onPointerDownHead(
                      input,
                      field,
                      inputDef
                    );
                    return (
                      <div class="flex items-center pb-2">
                        <div
                          ref={(ref) => {
                            setNodes(props.id, "inputs", key, j(), "ref", ref);
                          }}
                          class="absolute -left-4 w-8 h-8"
                          onPointerDown={(e) => {
                            onPointerDown(e, [props.id, key, j()]);
                          }}
                        >
                          <div class="border rounded-full bg-back-subtle m-2 w-4 h-4"></div>
                        </div>
                        <Dynamic
                          component={INPUT_MAP[inputDef.type] ?? TextInput}
                          value={
                            field.from != null
                              ? nodes[field.from!]!.output.value
                              : field.value
                          }
                          disabled={inputDef.array || field.from != null}
                          onValue={
                            field.from != null
                              ? null
                              : (v) => {
                                  const fi = j();
                                  setNodes(
                                    props.id,
                                    "inputs",
                                    key,
                                    fi,
                                    "value",
                                    v
                                  );
                                  if (
                                    inputDef.array &&
                                    fi === input.length - 1
                                  ) {
                                    setNodes(
                                      props.id,
                                      "inputs",
                                      key,
                                      fi + 1,
                                      {}
                                    );
                                  }
                                }
                          }
                          {...inputDef.props}
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
          <div class="select-none text-sm leading-none pb-1">
            {nodeDef.outputDef.label}
          </div>
          <div class="flex items-center">
            <Show when={nodeDef.outputDef.type !== "display"}>
              <div
                ref={(ref) => {
                  setNodes(props.id, "output", "ref", ref);
                }}
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
                  component={INPUT_MAP[nodeDef.outputDef.type]}
                  value={props.output.value}
                  onValue={(v) => {
                    setNodes(props.id, "output", "value", v);
                  }}
                  {...nodeDef.outputDef.props}
                />
              }
            >
              <Switch fallback={<TextInput value={outputValue()} disabled />}>
                <Match when={nodeDef.outputDef.type === "display"}>
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
