import ArrowLeftToLine from "lucide-solid/icons/arrow-left-to-line";
import ArrowRightToLine from "lucide-solid/icons/arrow-right-to-line";
import Search from "lucide-solid/icons/search";
import X from "lucide-solid/icons/x";
import { createMemo, createSignal, For, Show } from "solid-js";
import { containsPoint } from "../util/rect";
import { useCanvasContext, type Coords } from "./Canvas";
import { useNodesContext } from "./context/NodesContext";
import { createNode, NODE_DEFS } from "./nodes/factory";

const INPUT_KEYS: (keyof typeof NODE_DEFS)[] = [
  "text",
  "number",
  "qrCode",
  "svgString",
  "square",
  "circle",
  "webglCanvas",
];
const RENDER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "render",
  "background",
  "foreground",
  "combine",
  "absoluteMap",
  "dataUrl",
  "display",
];
const BASIC_FILTER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "gaussianBlur",
  "dropShadow",
  "offset",
];

const COLOR_EFFECT_KEYS: (keyof typeof NODE_DEFS)[] = [
  "colorMatrix",
  "componentTransfer",
  "componentTransferFunc",
  "flood",
];

const BLEND_COMPOSITE_KEYS: (keyof typeof NODE_DEFS)[] = [
  "blend",
  "composite",
  "merge",
];

const GEOMETRY_FILTER_KEYS: (keyof typeof NODE_DEFS)[] = [
  "convolveMatrix",
  "displacementMap",
  "morphology",
];

const SOURCE_KEYS: (keyof typeof NODE_DEFS)[] = [
  "source",
  "image",
  "turbulence",
  "tile",
];

const CONTAINER_KEYS: (keyof typeof NODE_DEFS)[] = ["filter", "applyFilter"];
const LIGHTING_KEYS: (keyof typeof NODE_DEFS)[] = [
  "diffuseLighting",
  "specularLighting",
  "distantLight",
  "pointLight",
  "spotLight",
];

// Category structure for better organization
const CATEGORIES = [
  { name: "INPUTS", keys: INPUT_KEYS },
  { name: "RENDER", keys: RENDER_KEYS },
  { name: "BASIC FILTERS", keys: BASIC_FILTER_KEYS },
  { name: "COLOR EFFECTS", keys: COLOR_EFFECT_KEYS },
  { name: "BLEND/COMPOSITE", keys: BLEND_COMPOSITE_KEYS },
  { name: "GEOMETRY", keys: GEOMETRY_FILTER_KEYS },
  { name: "SOURCES", keys: SOURCE_KEYS },
  { name: "CONTAINERS", keys: CONTAINER_KEYS },
  { name: "LIGHTING", keys: LIGHTING_KEYS },
];

export function Toolbox(props) {
  const { addNode, setActiveIds, nextNodeId } = useNodesContext();
  const { toCanvasCoords, canvasScale } = useCanvasContext();

  let toolbox!: HTMLDivElement;

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
  const [searchQuery, setSearchQuery] = createSignal("");

  // Filter categories and nodes based on search query
  const filteredCategories = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return CATEGORIES;

    return CATEGORIES.map((category) => ({
      ...category,
      keys: category.keys.filter((key) =>
        NODE_DEFS[key].title.toLowerCase().includes(query)
      ),
    })).filter((category) => category.keys.length > 0);
  });

  const clearSearch = () => setSearchQuery("");

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

          {/* Search Box */}
          <div class="p-2 border-b">
            <div class="relative">
              <Search
                size={16}
                class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search nodes..."
                class="w-full pl-8 pr-8 py-2 text-sm border border-gray-600 rounded bg-gray-700 text-gray-100 focus:(outline-none ring-2 ring-blue-500)"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
              />
              <Show when={searchQuery()}>
                <button
                  onClick={clearSearch}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </Show>
            </div>
          </div>

          {/* Categories and Nodes */}
          <div class="flex flex-col gap-1 p-2 overflow-y-auto">
            <For each={filteredCategories()}>
              {(category) => (
                <Show when={category.keys.length > 0}>
                  <div class="leading-none text-xs font-bold py-2 flex items-center justify-between">
                    <span>{category.name}</span>
                    <span class="text-gray-400 font-normal">
                      ({category.keys.length})
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-1">
                    <For each={category.keys}>
                      {(key) => (
                        <div
                          class="bg-back-subtle p-3 border leading-none font-bold text-xs hover:bg-gray-600"
                          onPointerDown={(e) => onPointerDownBaby(e, key)}
                        >
                          {NODE_DEFS[key].title}
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              )}
            </For>

            <Show when={filteredCategories().length === 0}>
              <div class="text-center text-gray-500 py-4">
                No nodes found for "{searchQuery()}"
              </div>
            </Show>
          </div>
        </Show>

        {/* Drag Preview */}
        <Show when={babyPos()}>
          {(pos) => (
            <div
              class="fixed top-0 left-0 bg-back-subtle p-4 border leading-none font-bold w-56 transition-scale"
              style={{
                translate: `${pos().x}px ${pos().y}px`,
                scale: overToolbox() ? 0.75 : canvasScale(),
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
