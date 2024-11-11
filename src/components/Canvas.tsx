import {
  createContext,
  createSignal,
  For,
  Index,
  Show,
  useContext,
  type Accessor,
  type Setter,
} from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { Node } from "./Node";
import { fuqrNode, NODE_MAP, textNode } from "./nodes/factory";
import { toDom } from "hast-util-to-dom";

export type Coords = {
  x: number;
  y: number;
};

export const CanvasContext = createContext<{
  canvasScale: Accessor<number>;
  toCanvasCoords: (clientX, clientY) => { x: number; y: number };
  setHandleCoords: Setter<{ x: number; y: number } | null>;
  setGhostHead: Setter<number | null>;
  setGhostTail: Setter<[number, string] | null>;
  // setCanvasScale: Setter<number>;
  // canvasOffset: Accessor<{ x: number; y: number }>;
  // // onPanMove: () => void;
  // // onPanRelease: () => void;
  // panning: Accessor<boolean>;
  // dragging: Accessor<boolean>;
  // setDragging: Setter<boolean>;
  // onPanStart: (e: PointerEvent) => void;
  // onZoom: (e: WheelEvent) => void;
  // onScroll: (e: WheelEvent) => void;
}>();

const BEZIER_HANDLE = 8;
function connectPath(startX, startY, endX, endY) {
  let dx = endX - startX;
  let dy = endY - startY;

  let handle = dx / 2;

  const minX = Math.min(Math.abs(dy) / 2, 5);

  if (handle < 0) {
    handle = Math.min(Math.max(-handle, minX), 200);
  } else {
    handle = Math.max(handle, minX);
  }
  return `M ${endX} ${endY} C ${endX - handle} ${endY} ${
    startX + handle
  } ${startY} ${startX} ${startY}`;
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext: used outside CanvasContextProvider");
  }
  return context;
}

export function Canvas(props) {
  const [dragging, setDragging] = createSignal(false);
  const [panning, setPanning] = createSignal(false);
  const [canvasOffset, setCanvasOffset] = createSignal({ x: 0, y: 0 });
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const [canvasScale, setCanvasScale] = createSignal(1);

  let prevT;
  let prevClientX;
  let prevClientY;
  let vx;
  let vy;

  let parentDiv: HTMLDivElement;
  const toCanvasCoords = (clientX, clientY) => {
    const rect = parentDiv.getBoundingClientRect();
    const scale = canvasScale();
    const offset = canvasOffset();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  };

  const onPanStart = (e: PointerEvent) => {
    prevClientX = e.clientX;
    prevClientY = e.clientY;
    prevT = performance.now();
    vx = 0;
    vy = 0;

    setPanning(true);
    document.addEventListener("pointerup", onPanRelease);
    document.addEventListener("pointermove", onPanMove);
  };

  const onPanRelease = () => {
    document.removeEventListener("pointerup", onPanRelease);
    document.removeEventListener("pointermove", onPanMove);
    setPanning(false);
    requestAnimationFrame(glide);
  };

  const EPSILON = 0.01; // px / ms
  const MAX_SPEED = 3; // px / ms
  const DECELARATION = 0.002; // px / ms / ms
  const glide = (t) => {
    if (panning()) return;

    let magnitude = Math.sqrt(vx * vx + vy * vy);
    if (magnitude < EPSILON) return;

    if (magnitude > MAX_SPEED) {
      vx = (vx / magnitude) * MAX_SPEED;
      vy = (vy / magnitude) * MAX_SPEED;
      magnitude = MAX_SPEED;
    }

    const deltaT = t - prevT;
    prevT = t;

    const dv = Math.min((DECELARATION * (deltaT * deltaT)) / 2, magnitude);
    const ratio = 1 - dv / magnitude;
    vx *= ratio;
    vy *= ratio;

    setCanvasOffset((offset) => ({
      x: offset.x + vx * deltaT,
      y: offset.y + vy * deltaT,
    }));

    requestAnimationFrame(glide);
  };

  const onPanMove = (e) => {
    // Don't scale here, b/c translate applied before scale
    const dx = e.clientX - prevClientX;
    const dy = e.clientY - prevClientY;

    setCanvasOffset((offset) => ({
      x: offset.x + dx,
      y: offset.y + dy,
    }));

    const now = performance.now();
    const dt = now - prevT;

    vx = dx / dt;
    vy = dy / dt;

    prevClientX = e.clientX;
    prevClientY = e.clientY;
    prevT = now;
  };

  /////////////////////

  const { nodes, addNode, removeNode, setNodes, activeIds, setActiveIds } =
    useNodesContext();

  let selectStartX;
  let selectStartY;

  const onSelectMove = (e) => {
    let startX = selectStartX;
    let startY = selectStartY;
    let { x: endX, y: endY } = toCanvasCoords(e.clientX, e.clientY);

    if (endX < startX) {
      startX = endX;
      endX = selectStartX;
    }
    if (endY < startY) {
      startY = endY;
      endY = selectStartY;
    }

    setSelectBox({
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
    });

    let minX, minY, maxX, maxY;
    const ids: number[] = [];
    for (const node of nodes) {
      if (node == null) continue;
      if (startX > node.x + node.width || endX < node.x) {
        continue;
      }
      if (startY > node.y + node.height || endY < node.y) {
        continue;
      }
      if (ids.length) {
        minX = Math.min(node.x, minX);
        minY = Math.min(node.y, minY);
        maxX = Math.max(node.x + node.width, maxX);
        maxY = Math.max(node.y + node.height, maxY);
      } else {
        minX = node.x;
        minY = node.y;
        maxX = node.x + node.width;
        maxY = node.y + node.height;
      }
      ids.push(node.id);
    }
    setActiveIds(ids);
    if (ids.length > 1) {
      setActiveBox({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    } else if (activeBox() != null) {
      setActiveBox(null);
    }
  };

  const onSelectRelease = () => {
    document.removeEventListener("pointerup", onSelectRelease);
    document.removeEventListener("pointermove", onSelectMove);
    setSelectBox(null);
  };

  const [selectingBox, setSelectBox] = createSignal<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [activeBox, setActiveBox] = createSignal<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const moveActive = (dx, dy) => {
    activeIds().forEach((id) => {
      setNodes(id, (node) => {
        return {
          ...node,
          x: node!.x + dx,
          y: node!.y + dy,
        };
      });
    });

    if (activeBox() != null) {
      setActiveBox((box) => ({
        x: box!.x + dx,
        y: box!.y + dy,
        width: box!.width,
        height: box!.height,
      }));
    }
  };
  const onDragActiveMove = (e: PointerEvent) => {
    const dx = (e.clientX - prevClientX) / canvasScale();
    const dy = (e.clientY - prevClientY) / canvasScale();
    moveActive(dx, dy);
    prevClientX = e.clientX;
    prevClientY = e.clientY;
  };
  const onDragActiveRelease = () => {
    document.removeEventListener("pointerup", onDragActiveRelease);
    document.removeEventListener("pointermove", onDragActiveMove);
    setDragging(false);
  };

  const getIdsAtPoint = (x, y) => {
    const wiggle = 10 / canvasScale();

    // if (active != null) {
    //   if (x <= active.x + active.width) return activeIds();
    // }

    const candidates: { ids: number[]; dist: number }[] = [];

    const selectables = nodes
      .filter((node) => node != null)
      .map((node) => ({
        ids: [node.id],
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }));
    const active = activeBox();
    if (active != null) {
      selectables.push({
        ids: activeIds(),
        ...active,
      });
    }

    // nodes is already in z index order
    search: for (let i = selectables.length - 1; i >= 0; i--) {
      const node = selectables[i];
      const leftD = node.x - x;
      if (leftD > wiggle) continue;
      const rightD = x - (node.x + node.width);
      if (rightD > wiggle) continue;
      const topD = node.y - y;
      if (topD > wiggle) continue;
      const botD = y - (node.y + node.height);
      if (botD > wiggle) continue;

      const maxD = Math.max(Math.max(leftD, rightD), Math.max(topD, botD));
      candidates.push({ ids: node.ids, dist: maxD });
      if (leftD <= 0 && rightD <= 0 && topD <= 0 && botD <= 0) {
        break search;
      }
    }
    if (candidates.length === 0) {
      return [];
    }
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].dist < candidates[0].dist) {
        candidates[0].dist = candidates[i].dist;
        candidates[0].ids = candidates[i].ids;
      }
    }
    return candidates[0].ids;
  };

  const [ghostHead, setGhostHead] = createSignal<number | null>(null);
  const [ghostTail, setGhostTail] = createSignal<[number, string] | null>(null);

  const [handleCoords, setHandleCoords] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  let toolbox: HTMLDivElement;

  const [babyPos, setBabyPos] = createSignal<Coords | null>(null);
  const [overToolbox, setOverToolbox] = createSignal(false);
  let babyText;
  let babyOffsetX;
  let babyOffsetY;

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Delete":
      case "Backspace": {
        activeIds().forEach((id) => removeNode(id));
        setActiveIds([]);
        setActiveBox(null);
      }
    }
  });

  return (
    <div
      ref={parentDiv!}
      classList={{
        "w-full h-full relative overflow-hidden": true,
        "cursor-grabbing": panning(),
      }}
      onPointerDown={(e) => {
        if (e.button === 0) {
          const coords = toCanvasCoords(e.clientX, e.clientY);

          const ids = getIdsAtPoint(coords.x, coords.y);
          const active = activeIds();

          if (ids.length) {
            if (
              ids.length === active.length &&
              ids.every((id, i) => id === active[i])
            ) {
            } else {
              setActiveIds(ids);
              setActiveBox(null);
            }

            if (e.target.tagName !== "INPUT") {
              prevClientX = e.clientX;
              prevClientY = e.clientY;
              setDragging(true);
              document.addEventListener("pointerup", onDragActiveRelease);
              document.addEventListener("pointermove", onDragActiveMove);
            }
            // document.addEventListener("keydown", onEsc);
          } else {
            selectStartX = coords.x;
            selectStartY = coords.y;
            if (active.length) {
              setActiveIds([]);
              setActiveBox(null);
            }
            document.addEventListener("pointerup", onSelectRelease);
            document.addEventListener("pointermove", onSelectMove);
          }
        } else if (e.button === 1) {
          onPanStart(e);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const oldScale = canvasScale();
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(oldScale * (1 - e.deltaY / 1000), MAX_SCALE)
          );
          if (newScale === oldScale) return;

          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const centerX = e.clientX - rect.left;
          const centerY = e.clientY - rect.top;

          setCanvasOffset((offset) => ({
            x: centerX - ((centerX - offset.x) / oldScale) * newScale,
            y: centerY - ((centerY - offset.y) / oldScale) * newScale,
          }));
          setCanvasScale(newScale);
        } else {
          let dx = e.deltaX;
          let dy = e.deltaY;
          if (e.shiftKey) {
            dx = dy;
            dy = 0;
          }
          setCanvasOffset((prev) => ({
            x: prev.x - dx,
            y: prev.y - dy,
          }));

          if (selectingBox() != null) {
            onSelectMove(e);
          }
          if (dragging()) {
            const scale = canvasScale();
            moveActive(dx / scale, dy / scale);
          }
        }
      }}
      onKeyDown={(e) => {
        // ignore events on inputs from reaching document listener
        e.stopImmediatePropagation();
      }}
    >
      <div
        ref={toolbox!}
        class="absolute bg-back-subtle border text-white flex flex-col gap-1 p-2 m-2 z-50"
        onPointerDown={(e) => {
          e.stopImmediatePropagation();
        }}
      >
        <div class="select-none leading-none font-bold pb-2">Toolbox</div>
        <For each={["Text", "QR Code", "Renderer"]}>
          {(val) => {
            return (
              <div
                class="p-4 border"
                onPointerDown={(e) => {
                  babyOffsetX = e.offsetX;
                  babyOffsetY = e.offsetY;

                  const onMove = (e) => {
                    setBabyPos({
                      x: e.clientX - babyOffsetX,
                      y: e.clientY - babyOffsetY,
                    });
                    setOverToolbox(toolbox.contains(e.target));
                  };
                  const onRelease = (e) => {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onRelease);

                    const rect = parentDiv.getBoundingClientRect();
                    if (
                      rect.left < e.clientX &&
                      e.clientX < rect.right &&
                      rect.top < e.clientY &&
                      e.clientY < rect.bottom &&
                      !toolbox.contains(e.target)
                    ) {
                      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
                      console.log("success drop", e.target);

                      console.log(props.preview);
                      const node = NODE_MAP[val]({
                        x: x - babyOffsetX,
                        y: y - babyOffsetY,
                      });
                      if (val === "Renderer") {
                        const now = node.function;
                        node.function = function (...args) {
                          const result = now(...args);
                          if (result == null) return;
                          props.preview.replaceChildren(toDom(result));
                          return result;
                        };
                      }
                      const id = addNode(node);
                      setActiveIds([id]);
                    }
                    setBabyPos(null);
                  };

                  babyText = val;
                  document.addEventListener("pointermove", onMove);
                  document.addEventListener("pointerup", onRelease);
                }}
              >
                <div class="select-none pointer-events-none leading-none font-bold w-48">
                  {val}
                </div>
              </div>
            );
          }}
        </For>
        <Show when={babyPos()}>
          {(pos) => (
            <div
              class="fixed top-0 left-0 p-4 border transition-scale"
              style={{
                translate: `${pos().x}px ${pos().y}px`,
                scale: overToolbox() ? 1 : canvasScale(),
                "transform-origin": `${babyOffsetX}px ${babyOffsetY}px`,
              }}
            >
              <div class="select-none pointer-events-none leading-none font-bold w-48">
                {babyText}
              </div>
            </div>
          )}
        </Show>
      </div>
      <CanvasContext.Provider
        value={{
          canvasScale,
          toCanvasCoords,
          setHandleCoords,
          setGhostHead,
          setGhostTail,
        }}
      >
        <div
          class="absolute"
          style={{
            translate: `${canvasOffset().x}px ${canvasOffset().y}px`,
            scale: canvasScale(),
          }}
        >
          <Index each={nodes}>
            {(node, i) => {
              console.log("index", i);
              return (
                <Show when={node()}>
                  {(currr) => {
                    const curr = currr();
                    return (
                      <Index each={Object.entries(curr.inputs)}>
                        {(entry) => {
                          const [_, input] = entry();
                          return (
                            <Show when={input.from != null}>
                              {(_) => {
                                const headId = input.from!;
                                const start = nodes[headId]!;
                                const d = () => {
                                  const startX =
                                    start.x + start.output.cx + BEZIER_HANDLE;
                                  const startY = start.y + start.output.cy;
                                  const endX =
                                    curr.x + input.cx + -BEZIER_HANDLE;
                                  const endY = curr.y + input.cy;
                                  return connectPath(
                                    startX,
                                    startY,
                                    endX,
                                    endY
                                  );
                                };
                                return (
                                  <svg class="absolute overflow-visible pointer-events-none">
                                    <path
                                      fill="none"
                                      stroke="rgb(137 137 137)"
                                      stroke-width={4}
                                      stroke-dasharray="8 12"
                                      stroke-linecap="round"
                                      d={d()}
                                    >
                                      <animate
                                        attributeName="stroke-dashoffset"
                                        from="0"
                                        to="20"
                                        dur="800ms"
                                        repeatCount="indefinite"
                                      />
                                    </path>
                                  </svg>
                                );
                              }}
                            </Show>
                          );
                        }}
                      </Index>
                    );
                  }}
                </Show>
              );
            }}
          </Index>
          <Show when={(ghostHead() == null) != (ghostTail() == null)}>
            {(_) => {
              const d = () => {
                let startX, startY, endX, endY;
                const otherCoords = handleCoords()!;

                const headId = ghostHead();
                if (headId != null) {
                  const node = nodes[headId]!;
                  startX = node.x + node.output.cx + BEZIER_HANDLE;
                  startY = node.y + node.output.cy;
                  endX = otherCoords.x - BEZIER_HANDLE;
                  endY = otherCoords.y;
                } else {
                  const tailPath = ghostTail()!;
                  const node = nodes[tailPath[0]]!;
                  const input = node.inputs[tailPath[1]];
                  endX = node.x + input.cx - BEZIER_HANDLE;
                  endY = node.y + input.cy;
                  startX = otherCoords.x + BEZIER_HANDLE;
                  startY = otherCoords.y;
                }
                return connectPath(startX, startY, endX, endY);
              };
              return (
                <svg class="absolute overflow-visible pointer-events-none">
                  <path
                    fill="none"
                    stroke="rgb(137 137 137)"
                    stroke-width={4}
                    stroke-dasharray="8 12"
                    stroke-linecap="round"
                    d={d()}
                  />
                </svg>
              );
            }}
          </Show>
          <Index each={nodes}>
            {(node) => {
              // const props = node();
              return (
                <Show when={node()}>{(props) => <Node {...props()} />}</Show>
              );
            }}
          </Index>
          <svg class="absolute overflow-visible pointer-events-none">
            <Show when={ghostHead() != null}>
              {(_) => {
                const node = nodes[ghostHead()!]!;
                return (
                  <circle
                    cx={node.x + node.output.cx}
                    cy={node.y + node.output.cy}
                    r="7"
                    fill="white"
                  />
                );
              }}
            </Show>
            <Show when={ghostTail() != null}>
              {(_) => {
                const path = ghostTail()!;
                const node = nodes[path[0]]!;
                const input = node.inputs[path[1]];
                return (
                  <circle
                    cx={node.x + input.cx}
                    cy={node.y + input.cy}
                    r="7"
                    fill="white"
                  />
                );
              }}
            </Show>
          </svg>
          <svg class="absolute overflow-visible pointer-events-none">
            <Show when={activeBox()}>
              <rect
                x={activeBox()!.x}
                y={activeBox()!.y}
                width={activeBox()!.width}
                height={activeBox()!.height}
                fill="none"
                stroke="rgb(244 63 94)"
                stroke-width={1 / canvasScale()}
                stroke-dasharray={`${5 / canvasScale()} ${5 / canvasScale()}`}
              />
            </Show>
          </svg>
          <svg class="absolute overflow-visible pointer-events-none">
            <Show when={selectingBox()}>
              <rect
                x={selectingBox()!.x}
                y={selectingBox()!.y}
                width={selectingBox()!.width}
                height={selectingBox()!.height}
                fill="rgb(244 63 94 / 0.1)"
                stroke="rgb(244 63 94)"
                stroke-width={1 / canvasScale()}
              />
            </Show>
          </svg>
        </div>
      </CanvasContext.Provider>
    </div>
  );
}
