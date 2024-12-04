import { createSignal, For, Show } from "solid-js";
import { useNodesContext } from "./context/NodesContext";
import { containsPoint } from "../util/rect";
import { createNode, NODE_DEFS } from "./nodes/factory";
import { useCanvasContext, type Coords } from "./Canvas";
import ArrowLeftToLine from "lucide-solid/icons/arrow-left-to-line";
import ArrowRightToLine from "lucide-solid/icons/arrow-right-to-line";

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
  "blend",
  "colorMatrix",
  // componentTransfer
  "composite",
  // convolveMatrix
  "displacementMap",
  // dropShadow
  // flood
  "gaussianBlur",
  "image",
  "merge",
  "morphology",
  // offset
  // tile
  "turbulence",
];
const LIGHTING_KEYS: (keyof typeof NODE_DEFS)[] = [
  // diffuseLighting
  // specularLighting
  // distantLight
  // pointLight
  // spotLight
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

  const [collapsed, setCollapsed] = createSignal(false);

  return (
    <div class="absolute p-2 z-50 select-none h-full">
      <div
        ref={toolbox!}
        class="bg-back-subtle rounded-lg border max-h-full flex flex-col"
        onPointerDown={(e) => {
          e.stopImmediatePropagation();
        }}
        onWheel={(e) => {
          e.stopImmediatePropagation();
        }}
      >
        <div class="flex justify-between items-center gap-2 px-2 py-1">
          <div class="font-bold">Toolbox</div>
          <button
            class="p-1 focus-visible:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base outline-none)"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <Show when={collapsed()} fallback={<ArrowLeftToLine size={20} />}>
              <ArrowRightToLine size={20} />
            </Show>
          </button>
        </div>
        <Show when={!collapsed()}>
          <hr class="mx-1" />
          <div class="flex flex-col gap-1 p-2 overflow-y-auto">
            <div class="leading-none text-xs font-bold py-2">INPUTS</div>
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
            <div class="leading-none text-xs font-bold py-2">RENDER</div>
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
            <div class="leading-none text-xs font-bold py-2">
              FILTER EFFECTS
            </div>
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
        </Show>
      </div>
    </div>
  );
}
