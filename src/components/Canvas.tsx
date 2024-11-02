import { createSignal, Index } from "solid-js";
import { ResizingTextInput } from "./ui/Input";
import { useNodesContext } from "./context/NodesContext";

export function Canvas() {
  const [dragging, setDragging] = createSignal(false);
  const [canvasOffset, setCanvasOffset] = createSignal({ x: 0, y: 0 });

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;
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

  const onRelease = () => {
    document.removeEventListener("mouseup", onRelease);
    document.removeEventListener("mousemove", onMove);
    setDragging(false);
    requestAnimationFrame(glide);
  };

  const onMove = (e) => {
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

  let parentDiv: HTMLDivElement;

  let prevT;
  let prevClientX;
  let prevClientY;
  let vx;
  let vy;

  const { nodes, addNode, setNodes } = useNodesContext();

  return (
    <div
      classList={{
        "w-full h-full relative overflow-hidden": true,
        "cursor-grabbing": dragging(),
      }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          prevClientX = e.clientX;
          prevClientY = e.clientY;
          prevT = performance.now();
          vx = 0;
          vy = 0;

          setDragging(true);
          document.addEventListener("mouseup", onRelease);
          document.addEventListener("mousemove", onMove);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();

          const oldScale = canvasScale();
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(oldScale - e.deltaY / 1000, MAX_SCALE)
          );
          if (newScale === oldScale) return;

          const rect = parentDiv.getBoundingClientRect();
          const centerX = e.clientX - rect.left;
          const centerY = e.clientY - rect.top;

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
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        addNode({
          x: (offsetX - canvasOffset().x) / canvasScale(),
          y: (offsetY - canvasOffset().y) / canvasScale(),
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
    </div>
  );
}

type NodeProps = {
  id: number;
  x: number;
  y: number;
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
        x: node!.x + (e.clientX - prevX) / props.canvasScale,
        y: node!.y + (e.clientY - prevY) / props.canvasScale,
      };
    });
    prevX = e.clientX;
    prevY = e.clientY;
  };

  const onDeselect = () => {
    document.removeEventListener("pointerdown", onDeselect);
    document.removeEventListener("keydown", onEsc);
    setNodes(props.id, "focused", false);
  };
  const onEsc = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    onDeselect();
  };

  let prevX;
  let prevY;

  return (
    <div
      ref={props.ref}
      classList={{
        "absolute text-white bg-back-base p-4": true,
        "outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base":
          props.focused,
      }}
      style={{
        translate: `${props.x}px ${props.y}px`,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;

        prevX = e.clientX;
        prevY = e.clientY;

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onRelease);

        if (nodes[props.id]!.focused) {
          // don't trigger document listeners added below
          e.stopImmediatePropagation();
          return;
        }
        setNodes(props.id, "focused", true);

        document.addEventListener("pointerdown", onDeselect);
        document.addEventListener("keydown", onEsc);
      }}
    >
      <ResizingTextInput
        defaultValue=""
        placeholder="Enter text..."
        onPointerDown={(e) => {
          e.stopImmediatePropagation();
        }}
      />
    </div>
  );
}
