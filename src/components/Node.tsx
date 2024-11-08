import { ResizingTextInput, TextInput } from "./ui/Input";
import { useNodesContext, type NodeCommon } from "./context/NodesContext";
import { createSignal, For, onMount, Show } from "solid-js";
import { useCanvasContext } from "./Canvas";
import { createStore } from "solid-js/store";

type NodeProps = NodeCommon;

export function Node(props: NodeProps) {
  const {
    canvasScale,
    toCanvasCoords,
    setActiveHandle,
    setHandleCoords,
    setGhostHead,
  } = useCanvasContext();
  const { nodes, setNodes, activeIds } = useNodesContext();

  let prevX;
  let prevY;

  const OUTLINE_WIDTH = 2;
  const outlineWidth = () => OUTLINE_WIDTH / canvasScale();

  onMount(() => {
    const scale = canvasScale();
    const rect = nodeRef.getBoundingClientRect();
    setNodes(props.id, {
      width: rect.width / scale,
      height: rect.height / scale,
      nodeRef,
    });

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

    const handle = outputHandleRef.getBoundingClientRect();
    const { x, y } = toCanvasCoords(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2
    );
    setNodes(props.id, "output", {
      cx: x - props.x,
      cy: y - props.y,
    });
  });

  let nodeRef: HTMLDivElement;
  const inputHandleRefs: HTMLDivElement[] = [];
  let outputHandleRef: HTMLDivElement;

  return (
    <div
      ref={nodeRef!}
      classList={{
        "absolute text-white bg-back-subtle p-4 border": true,
      }}
      style={{
        translate: `${props.x}px ${props.y}px`,
      }}
    >
      <svg
        classList={{
          "absolute overflow-visible pointer-events-none": true,
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
        <For each={Object.entries(props.inputs)}>
          {([key, input], i) => {
            console.log("for", key);
            return (
              <div>
                <div class="select-none">{input.label}</div>
                <div class="flex items-center">
                  <div
                    ref={inputHandleRefs[i()]}
                    class="absolute rounded-full -left-2 w-4 h-4 border bg-back-subtle"
                  >
                    <svg
                      class="absolute overflow-visible w-full h-full"
                      onPointerDown={(e) => {
                        e.stopImmediatePropagation();

                        const coords = toCanvasCoords(e.clientX, e.clientY);
                        setHandleCoords(coords);
                        // set after b/c show trigger
                        setActiveHandle([props.id, key]);

                        // const { x: startX, y: startY } = toCanvasCoords(
                        //   e.clientX,
                        //   e.clientY
                        // );
                        const validHeadSlots = nodes.filter(
                          (node) =>
                            node != null &&
                            node.id !== props.id &&
                            node.output.type === input.type
                        ) as NodeCommon[];

                        const R_SQUARED = 20 * 20;
                        const onMoveHead = (e: PointerEvent) => {
                          const coords = toCanvasCoords(e.clientX, e.clientY);

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
                            // setGhostHead(overlaps[0].id);
                            console.log("overlaps", overlaps[0].id);
                            setNodes(
                              props.id,
                              "inputs",
                              key,
                              "from",
                              overlaps[0].id
                            );

                            console.log(nodes[props.id]?.inputs[key].from);
                          } else {
                            // setGhostHead(null);
                            console.log("overlaps nothing");
                            setNodes(props.id, "inputs", key, "from", null);
                          }

                          setHandleCoords(coords);
                          // console.log("moveHead", x - startX, y - startY);
                          // setHeadPos(i(), { x: x - startX, y: y - startY });
                        };
                        const onReleaseHead = () => {
                          console.log("releaseHead");
                          document.removeEventListener(
                            "pointermove",
                            onMoveHead
                          );
                          document.removeEventListener(
                            "pointerup",
                            onReleaseHead
                          );
                          setActiveHandle(null);
                          // setHeadPos(null);
                        };

                        document.addEventListener("pointermove", onMoveHead);
                        document.addEventListener("pointerup", onReleaseHead);
                      }}
                    >
                      <circle cx="50%" cy="50%" r="30%" />
                      <Show when={input.from != null}>
                        <path d="" />
                      </Show>
                      {/* <Show when={headPos[i()]}>
                        <circle
                          cx={headPos[i()]!.x}
                          cy={headPos[i()]!.y}
                          r="30%"
                        />
                      </Show> */}
                    </svg>
                  </div>
                  {/* <div class="absolute z-30 rounded-full -left-1.5 w-3 h-3 bg-red"></div> */}
                  <ResizingTextInput
                    defaultValue=""
                    placeholder="Enter text..."
                    onInput={() => {
                      const scale = canvasScale();
                      const rect = nodeRef.getBoundingClientRect();
                      setNodes(props.id, {
                        width: rect.width / scale,
                        height: rect.height / scale,
                      });
                    }}
                  />
                </div>
              </div>
            );
          }}
        </For>
        <div>
          <div class="select-none">{props.output.label}</div>
          <div class="flex items-center">
            <div
              ref={outputHandleRef!}
              class="absolute -right-2 w-4 h-4 border bg-back-subtle"
            ></div>
            <TextInput defaultValue={props.output.value} />
          </div>
        </div>
      </div>
    </div>
  );
}
