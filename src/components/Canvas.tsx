import { createSignal, Index, Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { Node } from "./Node";

export function Canvas() {
  const [panning, setPanning] = createSignal(false);

  const [canvasOffset, setCanvasOffset] = createSignal({ x: 0, y: 0 });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const [canvasScale, setCanvasScale] = createSignal(1);

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

  const onPanRelease = () => {
    document.removeEventListener("pointerup", onPanRelease);
    document.removeEventListener("pointermove", onPanMove);
    setPanning(false);
    requestAnimationFrame(glide);
  };

  const onPanMove = (e) => {
    // Don't scale here, b/c translate applied before scale
    const dx = e.pageX - prevPageX;
    const dy = e.pageY - prevPageY;

    setCanvasOffset((offset) => ({
      x: offset.x + dx,
      y: offset.y + dy,
    }));

    const now = performance.now();
    const dt = now - prevT;

    vx = dx / dt;
    vy = dy / dt;

    prevPageX = e.pageX;
    prevPageY = e.pageY;
    prevT = now;
  };

  let parentDiv: HTMLDivElement;

  let prevT;
  let prevPageX;
  let prevPageY;
  let vx;
  let vy;

  const toCanvasCoords = (pageX, pageY) => {
    const rect = parentDiv.getBoundingClientRect();
    const scale = canvasScale();
    const offset = canvasOffset();
    return {
      x: (pageX - rect.left - offset.x) / scale,
      y: (pageY - rect.top - offset.y) / scale,
    };
  };

  const { nodes, addNode, setNodes, activeIds, setActiveIds } =
    useNodesContext();

  let selectStartX;
  let selectStartY;

  const onSelectMove = (e) => {
    let startX = selectStartX;
    let startY = selectStartY;
    let { x: endX, y: endY } = toCanvasCoords(e.pageX, e.pageY);

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
  };
  const onActiveMove = (e: PointerEvent) => {
    const dx = (e.pageX - prevPageX) / canvasScale();
    const dy = (e.pageY - prevPageY) / canvasScale();
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

    prevPageX = e.pageX;
    prevPageY = e.pageY;
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
          const coords = toCanvasCoords(e.pageX, e.pageY);

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

            prevPageX = e.pageX;
            prevPageY = e.pageY;
            document.addEventListener("pointerup", onActiveRelease);
            document.addEventListener("pointermove", onActiveMove);

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
          prevPageX = e.pageX;
          prevPageY = e.pageY;
          prevT = performance.now();
          vx = 0;
          vy = 0;

          setPanning(true);
          document.addEventListener("pointerup", onPanRelease);
          document.addEventListener("pointermove", onPanMove);
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

          const rect = parentDiv.getBoundingClientRect();
          const centerX = e.pageX - rect.left;
          const centerY = e.pageY - rect.top;

          setCanvasOffset((offset) => ({
            x: centerX - ((centerX - offset.x) / oldScale) * newScale,
            y: centerY - ((centerY - offset.y) / oldScale) * newScale,
          }));
          setCanvasScale(newScale);
        } else {
          if (panning()) return;
          setCanvasOffset((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
          if (selectingBox() != null) {
            onSelectMove(e);
          }
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const coords = toCanvasCoords(e.pageX, e.pageY);
        const id = addNode({
          x: coords.x - 100,
          y: coords.y - 100,
          width: 200,
          height: 200,
          ref: null,
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
            return (
              <Node
                {...props}
                ref={(r) => {
                  setNodes(props.id, "ref", r);
                }}
                canvasScale={canvasScale()}
              />
            );
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
