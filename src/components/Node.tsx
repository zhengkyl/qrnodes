import { ResizingTextInput } from "./ui/Input";
import { useNodesContext } from "./context/NodesContext";

type NodeProps = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ref: (ref: HTMLDivElement) => void;
  canvasScale: number;
};

export function Node(props: NodeProps) {
  const { setNodes, activeIds } = useNodesContext();

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
    >
      <svg
        classList={{
          "absolute overflow-visible fill-white -z-10": true,
          hidden: !activeIds().includes(props.id),
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
          onInput={(text, width) => {
            setNodes(props.id, "width", Math.max(width + 32, 200));
          }}
        />
      </div>
    </div>
  );
}
