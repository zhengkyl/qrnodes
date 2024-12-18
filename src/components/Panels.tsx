import { createSignal } from "solid-js";
import { Canvas } from "./Canvas";
import { Preview } from "./Preview";
import { Details } from "./Details";

export function Panels() {
  const [leftPercent, setLeftPercent] = createSignal(75);
  const [topPercent, setTopPercent] = createSignal(50);

  let flexParent: HTMLDivElement;

  const onResizeXEnd = () => {
    document.removeEventListener("pointerup", onResizeXEnd);
    document.removeEventListener("pointermove", onResizeX);
  };

  const onResizeYEnd = () => {
    document.removeEventListener("pointerup", onResizeYEnd);
    document.removeEventListener("pointermove", onResizeY);
  };

  const onResizeX = (e: MouseEvent) => {
    const pixelWidth = flexParent.clientWidth;
    const leftPixels = e.clientX - flexParent.offsetLeft;
    const clamped = Math.max(100, Math.min(leftPixels, pixelWidth - 100));
    setLeftPercent((clamped / pixelWidth) * 100);
  };

  const onResizeY = (e: MouseEvent) => {
    const pixelWidth = flexParent.clientHeight;
    const topPixels = e.clientY - flexParent.offsetTop;
    const clamped = Math.max(100, Math.min(topPixels, pixelWidth - 100));
    setTopPercent((clamped / pixelWidth) * 100);
  };

  return (
    <div ref={flexParent!} class="h-full min-h-0 flex relative">
      <div
        class="min-w-100px bg-back-base text-white"
        style={{ width: `calc(${leftPercent()}% - 0.5px)` }}
      >
        <Canvas />
      </div>
      <div
        class="w-px cursor-ew-resize relative bg-stone-300 select-none after:(content-[''] block w-2 -left-1 h-full absolute z-10)"
        onPointerDown={() => {
          document.addEventListener("pointerup", onResizeXEnd);
          document.addEventListener("pointermove", onResizeX);
        }}
      ></div>
      <div
        class="min-w-100px flex flex-col"
        style={{ width: `calc(${100 - leftPercent()}% - 0.5px)` }}
      >
        <div
          class="min-h-100px checkerboard"
          style={{
            height: `calc(${topPercent()}% - 0.5px)`,
          }}
        >
          <Preview />
        </div>
        <div
          class="h-px cursor-ns-resize relative bg-stone-300 select-none after:(content-[''] block h-2 -top-1 w-full absolute z-10)"
          onPointerDown={() => {
            document.addEventListener("pointerup", onResizeYEnd);
            document.addEventListener("pointermove", onResizeY);
          }}
        ></div>
        <div
          class="min-h-100px"
          style={{ height: `calc(${100 - topPercent()}% - 0.5px)` }}
        >
          <Details />
        </div>
      </div>
    </div>
  );
}
