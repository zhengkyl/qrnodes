import { createSignal, Index, Show } from "solid-js";
import { ResizingTextInput } from "./ui/Input";
import { useNodesContext } from "./context/NodesContext";

export function Canvas() {
  const [dragging, setDragging] = createSignal(false);
  const [canvasOffset, setCanvasOffset] = createSignal({ x: 0, y: 0 });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const [canvasScale, setCanvasScale] = createSignal(1);

  const EPSILON = 0.01; // px / ms
  const MAX_SPEED = 3; // px / ms
  const DECELARATION = 0.002; // px / ms / ms
  const glide = (t) => {
    if (dragging()) return;

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
    document.removeEventListener("mouseup", onPanRelease);
    document.removeEventListener("mousemove", onPanMove);
    setDragging(false);
    requestAnimationFrame(glide);
  };

  const onPanMove = (e) => {
    // Don't scale here, b/c translate applied before scale
    const dx = e.pageX - prevpageX;
    const dy = e.pageY - prevpageY;

    setCanvasOffset((offset) => ({
      x: offset.x + dx,
      y: offset.y + dy,
    }));

    const now = performance.now();
    const dt = now - prevT;

    vx = dx / dt;
    vy = dy / dt;

    prevpageX = e.pageX;
    prevpageY = e.pageY;
    prevT = now;
  };

  let parentDiv: HTMLDivElement;

  let prevT;
  let prevpageX;
  let prevpageY;
  let vx;
  let vy;

  const { nodes, addNode, setNodes } = useNodesContext();

  // const [selecting, setSelecting] = createSignal(false);

  let selectStartX;
  let selectStartY;

  const onSelectMove = (e) => {
    const { x: endX, y: endY } = toCanvasCoords(e.pageX, e.pageY);
    setBox({
      x: Math.min(selectStartX, endX),
      y: Math.min(selectStartY, endY),
      width: Math.abs(endX - selectStartX),
      height: Math.abs(endY - selectStartY),
    });
  };

  const onSelectRelease = () => {
    document.removeEventListener("mouseup", onSelectRelease);
    document.removeEventListener("mousemove", onSelectMove);
    setBox(null);
  };

  const [box, setBox] = createSignal<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const toCanvasCoords = (pageX, pageY) => {
    const rect = parentDiv.getBoundingClientRect();
    const scale = canvasScale();
    const offset = canvasOffset();
    return {
      x: (pageX - rect.left - offset.x) / scale,
      y: (pageY - rect.top - offset.y) / scale,
    };
  };

  return (
    <div
      classList={{
        "w-full h-full relative overflow-hidden": true,
        "cursor-grabbing": dragging(),
      }}
      onPointerDown={(e) => {
        if (e.button === 1) {
          prevpageX = e.pageX;
          prevpageY = e.pageY;
          prevT = performance.now();
          vx = 0;
          vy = 0;

          setDragging(true);
          document.addEventListener("mouseup", onPanRelease);
          document.addEventListener("mousemove", onPanMove);
        } else if (e.button === 0) {
          // clear selection if outside
          // move selection if inside...
          //
          const coords = toCanvasCoords(e.pageX, e.pageY);
          selectStartX = coords.x;
          selectStartY = coords.y;

          document.addEventListener("mouseup", onSelectRelease);
          document.addEventListener("mousemove", onSelectMove);
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
          if (dragging()) return;
          setCanvasOffset((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
        }
      }}
      onDblClick={(e) => {
        const rect = parentDiv.getBoundingClientRect();
        const offsetX = e.pageX - rect.left;
        const offsetY = e.pageY - rect.top;
        addNode({
          x: (offsetX - canvasOffset().x) / canvasScale(),
          y: (offsetY - canvasOffset().y) / canvasScale(),
          width: 200,
          height: 200,
          focused: false,
          ref: null,
        });
      }}
      ref={parentDiv!}
    >
      <div
        class="absolute"
        style={{
          translate: `${canvasOffset().x}px ${canvasOffset().y}px`,
          scale: canvasScale(),
          width: "10px",
          height: "10px",
          background: "wheat",
        }}
      >
        <Index each={nodes}>
          {(node, id) => {
            const props = node();
            if (props == null) return;
            return (
              <Node
                {...props}
                id={id}
                ref={(r) => {
                  setNodes(id, "ref", r);
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
          <Show when={box()}>
            <rect
              x={box()!.x}
              y={box()!.y}
              width={box()!.width}
              height={box()!.height}
              fill="rgb(244 63 94 / 0.1)"
              stroke="rgb(244 63 94)"
              stroke-width={1 / canvasScale()}
            />
          </Show>
        </svg>
      </div>
    </div>
  );
}

type NodeProps = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  focused: boolean;
  ref: (ref: HTMLDivElement) => void;
  canvasScale: number;
};
function Node(props: NodeProps) {
  const { nodes, setNodes } = useNodesContext();

  const onRelease = () => {
    document.removeEventListener("pointerup", onRelease);
    document.removeEventListener("pointermove", onMove);
  };
  const onMove = (e: PointerEvent) => {
    setNodes(props.id, (node) => {
      return {
        ...node,
        x: node!.x + (e.pageX - prevX) / props.canvasScale,
        y: node!.y + (e.pageY - prevY) / props.canvasScale,
      };
    });
    prevX = e.pageX;
    prevY = e.pageY;
  };

  const onClickOutside = (e) => {
    if (e.button !== 0) return;
    deselect();
  };
  const onEsc = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    deselect();
  };
  const deselect = () => {
    document.removeEventListener("pointerdown", onClickOutside);
    document.removeEventListener("keydown", onEsc);
    setNodes(props.id, "focused", false);
  };

  let prevX;
  let prevY;

  const OUTLINE_WIDTH = 2;
  const outlineWidth = () => OUTLINE_WIDTH / props.canvasScale;

  return (
    <div
      ref={props.ref}
      classList={{
        "absolute text-white bg-back-subtle p-4 border": true,
      }}
      style={{
        translate: `${props.x}px ${props.y}px`,
        width: `${props.width}px`,
        height: `${props.height}px`,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        prevX = e.pageX;
        prevY = e.pageY;

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onRelease);

        if (nodes[props.id]!.focused) {
          // don't deselect
          e.stopImmediatePropagation();
          return;
        } else {
          // don't start selection drag, but do deselect
          e.stopPropagation();
        }
        setNodes(props.id, "focused", true);

        document.addEventListener("pointerdown", onClickOutside);
        document.addEventListener("keydown", onEsc);
      }}
      onDblClick={(e) => {
        e.stopImmediatePropagation();
      }}
    >
      <svg
        classList={{
          "absolute overflow-visible fill-white -z-10": true,
          hidden: !props.focused,
        }}
        style={{
          top: `${-1}px`,
          left: `${-1}px`,
          width: `${props.width}px`,
          height: `${props.height}px`,
        }}
      >
        <rect x={0} y={0} width={props.width} height={outlineWidth()} />
        <rect x={0} y={0} width={outlineWidth()} height={props.height} />
        <rect
          x={props.width - outlineWidth()}
          y={0}
          width={outlineWidth()}
          height={props.height}
        />
        <rect
          x={0}
          y={props.height - outlineWidth()}
          width={props.width}
          height={outlineWidth()}
        />
      </svg>
      <div class="">
        <ResizingTextInput
          defaultValue=""
          placeholder="Enter text..."
          onPointerDown={(e) => {
            e.stopImmediatePropagation();
          }}
          onInput={(text, width) => {
            setNodes(props.id, "width", Math.max(width + 32, 200));
          }}
        />
      </div>
    </div>
  );
}
