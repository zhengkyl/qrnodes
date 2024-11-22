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
import { Node, type InputPathKey } from "./Node";
import { containsPoint } from "../util/rect";
import type { NodeInfo } from "./nodes/shared";
import { NODE_CONSTRUCTORS, NODE_DEFS } from "./nodes/factory";

export type Coords = {
  x: number;
  y: number;
};

export const CanvasContext = createContext<{
  canvasScale: Accessor<number>;
  toCanvasCoords: (clientX, clientY) => { x: number; y: number };
  setHandleCoords: Setter<{ x: number; y: number } | null>;
  setGhostHead: Setter<number | null>;
  setGhostTail: Setter<InputPathKey | null>;
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

export function Canvas() {
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

  const { nodes, removeNodes, setNodes, activeIds, setActiveIds } =
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

    // TODO nodes is NOT in z index order
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
  const [ghostTail, setGhostTail] = createSignal<InputPathKey | null>(null);

  const [handleCoords, setHandleCoords] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Delete":
      case "Backspace": {
        const prevActive = activeIds();
        setActiveIds([]);
        setActiveBox(null);
        removeNodes(prevActive);
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
          e.stopImmediatePropagation();
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
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON") {
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
          e.preventDefault(); // don't zoom browser
          const oldScale = canvasScale();
          let deltaY = e.deltaY;
          const sign = Math.sign(deltaY);
          if (sign * deltaY > 10) {
            deltaY = sign * 10;
          }
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(oldScale * (1 - deltaY / 100), MAX_SCALE)
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
            dx = dy || dx; // apple gives dx automatically?
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
        // stop events on inputs from reaching document listener
        e.stopImmediatePropagation();
      }}
    >
      <CanvasContext.Provider
        value={{
          canvasScale,
          toCanvasCoords,
          setHandleCoords,
          setGhostHead,
          setGhostTail,
        }}
      >
        <Toolbox parentDiv={parentDiv!} setActiveBox={setActiveBox} />
        <div
          class="absolute"
          style={{
            translate: `${canvasOffset().x}px ${canvasOffset().y}px`,
            scale: canvasScale(),
          }}
        >
          <Index each={nodes}>
            {(nodeOrNull) => (
              <Show when={nodeOrNull()}>
                {(_node) => {
                  const node = _node();
                  return (
                    <Index each={Object.values(node.inputs)}>
                      {(input) => {
                        // filter() creates a new array, so must use signal
                        return (
                          <For each={input()}>
                            {(field) => (
                              <Show when={field.from != null}>
                                <PlacedConnectorTail
                                  node={node}
                                  field={field}
                                />
                              </Show>
                            )}
                          </For>
                        );
                      }}
                    </Index>
                  );
                }}
              </Show>
            )}
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
                  const path = ghostTail()!;
                  const node = nodes[path[0]]!;
                  const input = node.inputs[path[1]][path[2]];
                  endX = node.x + input.cx - BEZIER_HANDLE;
                  endY = node.y + input.cy;
                  startX = otherCoords.x + BEZIER_HANDLE;
                  startY = otherCoords.y;
                }
                return connectPath(startX, startY, endX, endY);
              };
              return <ConnectorTail d={d()} />;
            }}
          </Show>
          <Index each={nodes}>
            {(node) => {
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
                const input = node.inputs[path[1]][path[2]];
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

const INPUT_KEYS: (keyof typeof NODE_DEFS)[] = ["text", "number", "qrCode"];
const RENDER_KEYS: (keyof typeof NODE_DEFS)[] = ["render", "display"];
const FILTER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "filter",
  "gaussianBlur",
  "turbulence",
  "displacementMap",
];

function Toolbox(props) {
  const { addNode, setActiveIds } = useNodesContext();
  const { toCanvasCoords, canvasScale } = useCanvasContext();

  let toolbox: HTMLDivElement;

  const [babyPos, setBabyPos] = createSignal<Coords | null>(null);
  const [overToolbox, setOverToolbox] = createSignal(true);
  let babyText;
  let babyOffsetX;
  let babyOffsetY;

  const onPointerDownBaby = (key, func) => (e) => {
    babyOffsetX = e.offsetX;
    babyOffsetY = e.offsetY;

    const onMove = (e) => {
      setBabyPos({
        x: e.clientX - babyOffsetX,
        y: e.clientY - babyOffsetY,
      });
      setOverToolbox(
        containsPoint(toolbox.getBoundingClientRect(), e.clientX, e.clientY)
      );
    };
    const onRelease = (e) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onRelease);

      const rect = props.parentDiv.getBoundingClientRect();
      const toolRect = toolbox.getBoundingClientRect();
      if (
        containsPoint(rect, e.clientX, e.clientY) &&
        !containsPoint(toolRect, e.clientX, e.clientY)
      ) {
        const { x, y } = toCanvasCoords(e.clientX, e.clientY);

        const node = func({
          x: x - babyOffsetX,
          y: y - babyOffsetY,
        });
        const id = addNode(node);
        setActiveIds([id]);
        props.setActiveBox(null); // TODO make it computed based on active ids
        setOverToolbox(true);
      }
      setBabyPos(null);
    };

    babyText = NODE_DEFS[key].title;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onRelease);
  };

  return (
    <div
      ref={toolbox!}
      class="absolute bg-back-subtle border flex flex-col gap-1 p-2 m-2 z-50 select-none"
      onPointerDown={(e) => {
        e.stopImmediatePropagation();
      }}
    >
      <div class="leading-none font-bold pb-2">Inputs</div>
      <For each={INPUT_KEYS}>
        {(key) => {
          return (
            <div
              class="p-3.5 border leading-none font-bold text-sm w-49"
              onPointerDown={onPointerDownBaby(key, NODE_CONSTRUCTORS[key])}
            >
              {NODE_DEFS[key].title}
            </div>
          );
        }}
      </For>
      <div class="leading-none font-bold py-2">Renderers</div>
      <For each={RENDER_KEYS}>
        {(key) => {
          return (
            <div
              class="p-3.5 border leading-none font-bold text-sm w-49"
              onPointerDown={onPointerDownBaby(key, NODE_CONSTRUCTORS[key])}
            >
              {NODE_DEFS[key].title}
            </div>
          );
        }}
      </For>
      <div class="leading-none font-bold py-2">Filter Effects</div>
      <For each={FILTER_KEYS}>
        {(key) => {
          return (
            <div
              class="p-3.5 border leading-none font-bold text-sm w-49"
              onPointerDown={onPointerDownBaby(key, NODE_CONSTRUCTORS[key])}
            >
              {NODE_DEFS[key].title}
            </div>
          );
        }}
      </For>
      <Show when={babyPos()}>
        {(pos) => (
          <div
            class="fixed top-0 left-0 p-4 border leading-none font-bold w-56 transition-scale"
            style={{
              translate: `${pos().x}px ${pos().y}px`,
              scale: overToolbox() ? 0.875 : canvasScale(),
              "transform-origin": `${babyOffsetX}px ${babyOffsetY}px`,
            }}
          >
            {babyText}
          </div>
        )}
      </Show>
    </div>
  );
}

function PlacedConnectorTail(props: {
  node: NodeInfo;
  field: NodeInfo["inputs"][string][number];
}) {
  const { nodes } = useNodesContext();
  const headId = props.field.from!;
  const start = nodes[headId]!;
  const d = () => {
    const startX = start.x + start.output.cx + BEZIER_HANDLE;
    const startY = start.y + start.output.cy;
    const endX = props.node.x + props.field.cx + -BEZIER_HANDLE;
    const endY = props.node.y + props.field.cy;
    return connectPath(startX, startY, endX, endY);
  };
  return (
    <ConnectorTail d={d()}>
      <animate
        attributeName="stroke-dashoffset"
        from="0"
        to="20"
        dur="800ms"
        repeatCount="indefinite"
      />
    </ConnectorTail>
  );
}
function ConnectorTail(props) {
  return (
    <svg class="absolute overflow-visible pointer-events-none">
      <path
        fill="none"
        stroke="rgb(137 137 137)"
        stroke-width={4}
        stroke-dasharray="8 12"
        stroke-linecap="round"
        d={props.d}
      >
        {props.children}
      </path>
    </svg>
  );
}
