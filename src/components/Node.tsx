import { ResizingTextInput } from "./ui/Input";
import { useNodesContext, type NodeCommon } from "./context/NodesContext";
import { useCanvasContext } from "./context/CanvasContext";
import { For, onMount, Show } from "solid-js";

type NodeProps = NodeCommon;

export function Node(props: NodeProps) {
  const { canvasScale, dragging } = useCanvasContext();
  const { nodes, setNodes, activeIds } = useNodesContext();

  const onRelease = () => {
    document.removeEventListener("pointerup", onRelease);
    document.removeEventListener("pointermove", onMove);
  };
  const onMove = (e: PointerEvent) => {
    const dx = (e.clientX - prevX) / canvasScale();
    const dy = (e.clientY - prevY) / canvasScale();
    setNodes(props.id, (node) => {
      return {
        ...node,
        x: node!.x + dx,
        y: node!.y + dy,
      };
    });
    prevX = e.clientX;
    prevY = e.clientY;
  };

  let prevX;
  let prevY;

  const OUTLINE_WIDTH = 2;
  const outlineWidth = () => OUTLINE_WIDTH / canvasScale();

  onMount(() => {
    const scale = canvasScale();
    const rect = nodes[props.id]!.ref!.getBoundingClientRect();
    setNodes(props.id, {
      width: rect.width / scale,
      height: rect.height / scale,
    });
  });

  return (
    <div
      ref={(r) => {
        setNodes(props.id, "ref", r);
      }}
      classList={{
        "absolute text-white bg-back-subtle p-4 border": true,
      }}
      style={{
        translate: `${props.x}px ${props.y}px`,
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
      <div class="flex flex-col gap-4">
        <For each={props.fields}>
          {(field) => {
            return (
              <div>
                <div>{field.label}</div>
                <div>
                  <Show when={field.pipe.in}>
                    <svg width={20} height={20}>
                      <circle fill="red" cx="10" cy="10" r="10" />
                    </svg>
                  </Show>
                  <ResizingTextInput
                    defaultValue=""
                    placeholder="Enter text..."
                    onInput={() => {
                      const scale = canvasScale();
                      const rect =
                        nodes[props.id]!.ref!.getBoundingClientRect();
                      setNodes(props.id, {
                        width: rect.width / scale,
                        height: rect.height / scale,
                      });
                    }}
                  />
                  <Show when={!field.pipe.in}>
                    <svg width={20} height={20}>
                      <circle fill="red" cx="10" cy="10" r="10" />
                    </svg>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
