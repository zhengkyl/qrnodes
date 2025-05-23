import {
  batch,
  createRenderEffect,
  For,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { produce, unwrap } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import { equal } from "../util/path";
import { useCanvasContext } from "./Canvas";
import { useNodesContext } from "./context/NodesContext";
import { NODE_DEFS } from "./nodes/factory";
import type { InputType, NodeDef, NodeInfo } from "./nodes/shared";
import { FilterEffectInput, FuncInput } from "./ui/ComplexInputs";
import { MatrixInput } from "./ui/MatrixInput";
import { NumberPairInput, SliderNumberInput } from "./ui/NumberInput";
import { Select } from "./ui/Select";
import { Switch } from "./ui/Switch";
import { Textarea, TextInput } from "./ui/TextInput";
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

    // NOTE: this is smart/deduped? so it will not trigger with same size
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize[0].inlineSize;
        const height = entry.borderBoxSize[0].blockSize;

        setNodes(props.id, { width, height });

        Object.entries(props.inputs).forEach(([key, input]) => {
          for (let j = 0; j < input.length; j++) {
            if (input[j].ref != null) {
              updateHandlePos(input[j].ref, ["inputs", key, j]);
            }
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
    // observer is null if something undefined, but this runs before that code errors
    if (observer == null) return;
    observer.unobserve(nodeRef);
  });

  const setFieldNull = (toPath) => {
    setNodes(toPath[0], "inputs", toPath[1], toPath[2], "from", null);

    if (
      NODE_DEFS[nodes[toPath[0]]!.key].inputsDef[toPath[1]].array &&
      toPath[2] === nodes[toPath[0]]!.inputs[toPath[1]].length - 2
    ) {
      setNodes(toPath[0], "inputs", toPath[1], (fields) => fields.slice(0, -1));
    }
  };

  const setFieldFrom = (toPath, fromId) => {
    setNodes(toPath[0], "inputs", toPath[1], toPath[2], "from", fromId);

    const toNode = nodes[toPath[0]]!;
    const input = toNode.inputs[toPath[1]];
    const inputDef = NODE_DEFS[toNode.key].inputsDef[toPath[1]];
    if (inputDef.array && toPath[2] === input.length - 1) {
      setNodes(toPath[0], "inputs", toPath[1], toPath[2] + 1, {
        value: null,
      });
    }
  };

  let nodeRef!: HTMLDivElement;

  const onPointerDownTail = (
    fromId: number,
    oldToPath: InputPathKey | null
  ) => {
    if (oldToPath != null) {
      setFieldNull(oldToPath);
    }
    setGhostHead(fromId);

    const validInputs: {
      cx: number;
      cy: number;
      path: InputPathKey;
    }[] = [];
    const validType = NODE_DEFS[nodes[fromId]!.key].outputDef.type;
    nodes.forEach((node) => {
      if (node == null) return;
      if (node.id == fromId) return;
      const inputsDef = NODE_DEFS[nodes[node.id]!.key].inputsDef;
      Object.entries(node.inputs).forEach(([key, input]) => {
        const condition = inputsDef[key].condition;
        if (condition != null && !condition(node)) return;
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
    let avoidOld = oldToPath != null;
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

        const isOldPath = avoidOld && equal(input.path, oldToPath!);
        if (d2 < R_SQUARED) {
          if (!isOldPath) {
            overlaps.push({ dist: d2, path: input.path });
          }
        } else if (isOldPath) {
          avoidOld = false;
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
        setFieldFrom(toPath, fromId);
      } else {
        if (toPath == null) return;
        setFieldNull(toPath);
        toPath = null;
        setGhostTail(null);
      }
    };

    const onReleaseTail = () => {
      document.removeEventListener("pointermove", onMoveTail);
      document.removeEventListener("pointerup", onReleaseTail);
      batch(() => {
        setGhostHead(null);
        setGhostTail(null);

        if (
          oldToPath != null &&
          (toPath == null || !equal(oldToPath, toPath))
        ) {
          const delNode = nodes[oldToPath[0]]!;
          const input = delNode.inputs[oldToPath[1]];
          const inputDef = NODE_DEFS[delNode.key].inputsDef[oldToPath[1]];
          // last one removed by move handler already
          if (inputDef.array && oldToPath[2] !== input.length - 1) {
            setNodes(oldToPath[0], "inputs", oldToPath[1], (prevFields) =>
              prevFields.filter((_, i) => i !== oldToPath[2])
            );
          }
        }
      });
    };

    document.addEventListener("pointermove", onMoveTail);
    document.addEventListener("pointerup", onReleaseTail);
  };

  const onPointerDownHead = (type, toPath: InputPathKey) => {
    setGhostTail(toPath);

    const validOutputs = nodes.filter(
      (node) =>
        node != null &&
        node.id !== props.id &&
        NODE_DEFS[node.key].outputDef.type === type
    ) as NodeInfo[];

    let fromId: number | null = null;
    const onMoveHead = (e: PointerEvent) => {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setHandleCoords(coords);

      const overlaps: { dist: number; id: number }[] = [];
      validOutputs.forEach((node) => {
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
        setFieldFrom(toPath, fromId);
      } else {
        if (fromId == null) return;
        fromId = null;
        setGhostHead(null);
        setFieldNull(toPath);
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
  };

  createRenderEffect(() => {
    const inputs = {};
    const unwrapNodes = unwrap(nodes);

    // TODO tracking doesn't work for objects that aren't set with produce
    // there aren't any nodes like that, but keep an eye out
    Object.entries(props.inputs).forEach(([key, input]) => {
      const inputDef = nodeDef.inputsDef[key];
      if (inputDef.array) {
        inputs[key] = [];
        input.forEach((field, j) => {
          if (field == null) return;
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
  });

  // NOTE: inputs has STABLE number of key,value pairs
  const numInputs = Object.keys(props.inputs).length;

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
          {([key, input], i) => {
            const inputDef = nodeDef.inputsDef[key];
            return (
              <Show
                when={inputDef.condition == null || inputDef.condition(props)}
              >
                <div>
                  <div class="select-none text-sm leading-none pb-1">
                    {inputDef.label}
                  </div>
                  <For each={input}>
                    {(field, j) => {
                      return (
                        <div class="flex items-center pb-2">
                          <Show
                            when={
                              nodeDef.outputDef.connector === "lastInput" &&
                              i() === numInputs - 1
                            }
                            fallback={
                              <InputConnector
                                path={[props.id, key, j()]}
                                type={inputDef.type}
                                field={field}
                                onPointerDownHead={onPointerDownHead}
                                onPointerDownTail={onPointerDownTail}
                              />
                            }
                          >
                            <OutputConnector
                              id={props.id}
                              onPointerDown={onPointerDownTail}
                            />
                          </Show>
                          <Dynamic
                            component={INPUT_MAP[inputDef.type]}
                            value={
                              field.from != null
                                ? nodes[field.from!]!.output.value
                                : field.value
                            }
                            disabled={inputDef.array || field.from != null}
                            onValue={
                              field.from != null
                                ? null
                                : (value) => {
                                    const fi = j();
                                    setNodes(
                                      props.id,
                                      "inputs",
                                      key,
                                      fi,
                                      "value",
                                      value
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
                                        {
                                          value: null,
                                        }
                                      );
                                    }
                                  }
                            }
                            rows={
                              props.key === "convolveMatrix" &&
                              key === "kernelMatrix"
                                ? props.inputs.order[0].value[1]
                                : undefined
                            }
                            columns={
                              props.key === "convolveMatrix" &&
                              key === "kernelMatrix"
                                ? props.inputs.order[0].value[0]
                                : undefined
                            }
                            {...inputDef.props}
                          />
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            );
          }}
        </For>
        <Show when={nodeDef.outputDef.connector !== "lastInput"}>
          <div>
            <div class="select-none text-sm leading-none pb-1">
              {nodeDef.outputDef.label}
            </div>
            <div class="flex items-center">
              <Show
                when={nodeDef.outputDef.connector === "none"}
                fallback={
                  <>
                    <OutputConnector
                      id={props.id}
                      onPointerDown={onPointerDownTail}
                    />
                    <TextInput value={props.output.value} disabled />
                  </>
                }
              >
                <DisplayOutput output={props.output.value} />
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

type OutputConnectorProps = {
  id: number;
  onPointerDown: (id: number, path: null) => void;
};
function OutputConnector(props: OutputConnectorProps) {
  const { setHandleCoords, toCanvasCoords } = useCanvasContext();
  const { setNodes } = useNodesContext();
  return (
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

        props.onPointerDown(props.id, null);
      }}
    >
      <div class="border bg-back-subtle m-2 w-4 h-4"></div>
    </div>
  );
}

type InputConnectorProps = {
  path: InputPathKey;
  type: string;
  field: NodeInfo["inputs"][string][number];
  onPointerDownHead: (type: string, path: InputPathKey) => void;
  onPointerDownTail: (fromId: number, path: InputPathKey) => void;
};
function InputConnector(props: InputConnectorProps) {
  const { setHandleCoords, toCanvasCoords } = useCanvasContext();
  const { setNodes } = useNodesContext();

  return (
    <div
      ref={(ref) => {
        setNodes(
          props.path[0],
          "inputs",
          props.path[1],
          props.path[2],
          "ref",
          ref
        );
      }}
      class="absolute -left-4 w-8 h-8"
      onPointerDown={(e) => {
        e.preventDefault(); // don't trigger img drag
        e.stopImmediatePropagation();
        const coords = toCanvasCoords(e.clientX, e.clientY);
        setHandleCoords(coords);
        if (props.field.from != null) {
          props.onPointerDownTail(props.field.from, props.path);
        } else {
          props.onPointerDownHead(props.type, props.path);
        }
      }}
    >
      <div class="border rounded-full bg-back-subtle m-2 w-4 h-4"></div>
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

const INPUT_MAP: { [key in InputType]: Component<any> } = {
  boolean: Switch,
  string: TextInput,
  textarea: Textarea,
  number: SliderNumberInput,
  number_pair: NumberPairInput,
  select: Select,
  matrix: MatrixInput,
  hast_fe: FilterEffectInput,
  component_transfer_func: FuncInput,
  //
  qr_code: TextInput,
  hast: TextInput,
  hast_filter: TextInput,
  hast_light: TextInput,
};
