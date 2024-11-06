import { createSignal, Index, Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { Node } from "./Node";
import { useCanvasContext } from "./context/CanvasContext";

export function Canvas() {
  const {
    canvasScale,
    setCanvasScale,
    canvasOffset,
    panning,
    onZoom,
    onScroll,
    onPanStart,
    setDragging,
  } = useCanvasContext();

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

  const { nodes, addNode, setNodes, activeIds, setActiveIds } =
    useNodesContext();

  let prevClientX;
  let prevClientY;

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

  const onActiveRelease = () => {
    document.removeEventListener("pointerup", onActiveRelease);
    document.removeEventListener("pointermove", onActiveMove);
    setDragging(false);
  };
  const onActiveMove = (e: PointerEvent) => {
    const dx = (e.clientX - prevClientX) / canvasScale();
    const dy = (e.clientY - prevClientY) / canvasScale();
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

    prevClientX = e.clientX;
    prevClientY = e.clientY;
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
    if (candidates.length > 1) {
      for (const cand of candidates) {
        if (cand.dist < candidates[0].dist) {
          candidates[0].dist = cand.dist;
          candidates[0].ids = cand.ids;
        }
      }
    }
    return candidates[0].ids;
  };

  return (
    <div
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
            // console.log("first");
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
              document.addEventListener("pointerup", onActiveRelease);
              document.addEventListener("pointermove", onActiveMove);
            }
            // document.addEventListener("keydown", onEsc);
          } else {
            // console.log("second");
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
          onZoom(e);
        } else {
          if (panning()) return;
          onScroll(e);
          if (selectingBox() != null) {
            onSelectMove(e);
          }
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const coords = toCanvasCoords(e.clientX, e.clientY);
        const id = addNode({
          x: coords.x - 100,
          y: coords.y - 100,
          width: 200,
          height: 200,
          ref: null,
          fields: [
            {
              type: "string",
              pipe: {
                in: true,
                ids: [],
              },
              label: "Label1",
            },
            {
              type: "number",
              pipe: {
                in: true,
                ids: [],
              },
              label: "Label1",
            },
            {
              type: "number",
              pipe: {
                in: false,
                ids: [],
              },
              label: "Label1",
            },
          ],
        });
        setActiveIds([id]);
        setActiveBox(null);
      }}
      ref={parentDiv!}
    >
      <div
        class="absolute"
        style={{
          translate: `${canvasOffset().x}px ${canvasOffset().y}px`,
          scale: canvasScale(),
        }}
      >
        <Index each={nodes}>
          {(node) => {
            const props = node();
            if (props == null) return;
            return <Node {...props} />;
          }}
        </Index>
      </div>
      <div
        class="absolute"
        style={{
          translate: `${canvasOffset().x}px ${canvasOffset().y}px`,
          scale: canvasScale(),
        }}
      >
        <svg class="overflow-visible w-0 h-0 z-10">
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
      </div>
    </div>
  );
}
