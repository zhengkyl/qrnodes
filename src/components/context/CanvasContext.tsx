import {
  createContext,
  createSignal,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from "solid-js";

export const CanvasContext = createContext<{
  canvasScale: Accessor<number>;
  setCanvasScale: Setter<number>;
  canvasOffset: Accessor<{ x: number; y: number }>;
  // onPanMove: () => void;
  // onPanRelease: () => void;
  panning: Accessor<boolean>;
  dragging: Accessor<boolean>;
  setDragging: Setter<boolean>;
  onPanStart: (e: PointerEvent) => void;
  onZoom: (e: WheelEvent) => void;
  onScroll: (e: WheelEvent) => void;
}>();

export function CanvasContextProvider(props: { children: JSX.Element }) {
  const [dragging, setDragging] = createSignal(false);
  const [panning, setPanning] = createSignal(false);
  const [canvasOffset, setCanvasOffset] = createSignal({ x: 0, y: 0 });
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const [canvasScale, setCanvasScale] = createSignal(1);

  let prevT;
  let prevClientX;
  let prevClientY;
  let vx;
  let vy;

  const onPanStart = (e: PointerEvent) => {
    prevClientX = e.clientX;
    prevClientY = e.clientY;
    prevT = performance.now();
    vx = 0;
    vy = 0;

    setPanning(true);
    document.addEventListener("pointerup", onPanRelease);
    document.addEventListener("pointermove", onPanMove);
  };

  const onPanRelease = () => {
    document.removeEventListener("pointerup", onPanRelease);
    document.removeEventListener("pointermove", onPanMove);
    setPanning(false);
    requestAnimationFrame(glide);
  };

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

  const onPanMove = (e) => {
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

  const onZoom = (e: WheelEvent) => {
    const oldScale = canvasScale();
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(oldScale * (1 - e.deltaY / 1000), MAX_SCALE)
    );
    if (newScale === oldScale) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    setCanvasOffset((offset) => ({
      x: centerX - ((centerX - offset.x) / oldScale) * newScale,
      y: centerY - ((centerY - offset.y) / oldScale) * newScale,
    }));
    setCanvasScale(newScale);
  };

  const onScroll = (e: WheelEvent) => {
    setCanvasOffset((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };

  return (
    <CanvasContext.Provider
      value={{
        canvasScale,
        setCanvasScale,
        canvasOffset,
        panning,
        dragging,
        setDragging,
        onZoom,
        onScroll,
        onPanStart,
      }}
    >
      {props.children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext: used outside CanvasContextProvider");
  }
  return context;
}
