import { createSignal } from "solid-js";

function App() {
  const [leftPercent, setLeftPercent] = createSignal(50);
  const [topPercent, setTopPercent] = createSignal(50);

  let flexParent: HTMLDivElement;

  const onResizeXEnd = () => {
    window.removeEventListener("pointerup", onResizeXEnd);
    window.removeEventListener("pointermove", onResizeX);
  };

  const onResizeYEnd = () => {
    window.removeEventListener("pointerup", onResizeYEnd);
    window.removeEventListener("pointermove", onResizeY);
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
    <div class="flex flex-col h-screen">
      <div>
        <h1>qrnodes</h1>
      </div>
      <div class="w-full h-full flex relative" ref={flexParent!}>
        <div
          class="min-w-100px bg-red"
          style={{ width: `calc(${leftPercent()}% - 0.5px)` }}
        ></div>
        <div
          class="w-px cursor-ew-resize relative bg-stone-300 select-none after:(content-[''] block w-2 -left-1 h-full absolute z-10)"
          onPointerDown={() => {
            window.addEventListener("pointerup", onResizeXEnd);
            window.addEventListener("pointermove", onResizeX);
          }}
        ></div>
        <div
          class="min-w-100px flex flex-col"
          style={{ width: `calc(${100 - leftPercent()}% - 0.5px)` }}
        >
          <div
            class="min-h-100px bg-green"
            style={{ height: `calc(${topPercent()}% - 0.5px)` }}
          ></div>
          <div
            class="h-px cursor-ns-resize relative bg-stone-300 select-none after:(content-[''] block h-2 -top-1 w-full absolute z-10)"
            onPointerDown={() => {
              window.addEventListener("pointerup", onResizeYEnd);
              window.addEventListener("pointermove", onResizeY);
            }}
          ></div>
          <div
            class="min-h-100px bg-blue"
            style={{ height: `calc(${100 - topPercent()}% - 0.5px)` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default App;
