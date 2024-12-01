import { createSignal, For, Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { containsPoint } from "../util/rect";
import { createNode, NODE_DEFS } from "./nodes/factory";
import { useCanvasContext, type Coords } from "./Canvas";

const INPUT_KEYS: (keyof typeof NODE_DEFS)[] = ["text", "number", "qrCode"];
const RENDER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "render",
  "absoluteMap",
  "dataUrl",
  "display",
];
const FILTER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "filter",
  "applyFilter",
  "source",
  "gaussianBlur",
  "turbulence",
  "displacementMap",
  "image",
  "merge",
  "composite",
];

export function Toolbox(props) {
  const { addNode, setActiveIds, nextNodeId } = useNodesContext();
  const { toCanvasCoords, canvasScale } = useCanvasContext();

  let toolbox: HTMLDivElement;

  const [babyPos, setBabyPos] = createSignal<Coords | null>(null);
  const [overToolbox, setOverToolbox] = createSignal(true);
  let babyText;
  let babyOffsetX;
  let babyOffsetY;

  const onPointerDownBaby = (e, key) => {
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
        const node = createNode({
          id: nextNodeId(),
          key,
          x: x - babyOffsetX,
          y: y - babyOffsetY,
        });
        addNode(node);
        setActiveIds([node.id]);
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
      class="absolute p-2 z-50 select-none max-h-full overflow-y-auto"
      onPointerDown={(e) => {
        e.stopImmediatePropagation();
      }}
      onWheel={(e) => {
        e.stopImmediatePropagation();
      }}
    >
      <div class="bg-back-subtle border flex flex-col gap-1 p-2">
        <div class="leading-none font-bold pb-2">Inputs</div>
        <For each={INPUT_KEYS}>
          {(key) => {
            return (
              <div
                class="p-3.5 border leading-none font-bold text-sm w-49"
                onPointerDown={(e) => onPointerDownBaby(e, key)}
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
                onPointerDown={(e) => onPointerDownBaby(e, key)}
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
                onPointerDown={(e) => onPointerDownBaby(e, key)}
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
    </div>
  );
}
