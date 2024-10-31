import { createSignal } from "solid-js";

export function Canvas() {
  const [offset, setOffset] = createSignal({ x: 0, y: 0 });

  const EPSILON = 0.01; // px / ms
  const MAX_SPEED = 3; // px / ms
  const DECELARATION = 0.002; // px / ms / ms
  const glide = (t) => {
    if (dragging) return;

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

    setOffset((prev) => ({
      x: prev.x + vx * deltaT,
      y: prev.y + vy * deltaT,
    }));

    requestAnimationFrame(glide);
  };

  const onRelease = () => {
    dragging = false;
    window.removeEventListener("mouseup", onRelease);
    window.removeEventListener("mousemove", onMove);
    requestAnimationFrame(glide);
  };

  const onMove = (e) => {
    setOffset((prev) => ({
      x: prev.x + e.clientX - prevX,
      y: prev.y + e.clientY - prevY,
    }));

    const now = performance.now();
    const dt = now - prevT;

    vx = (e.clientX - prevX) / dt;
    vy = (e.clientY - prevY) / dt;

    prevX = e.clientX;
    prevY = e.clientY;
    prevT = now;
  };

  let transformDiv: HTMLDivElement;

  let prevT;
  let prevX;
  let prevY;
  let vx;
  let vy;

  let dragging = false;

  return (
    <div
      class="w-full h-full relative overflow-hidden"
      onMouseDown={(e) => {
        if (e.button === 1) {
          prevX = e.clientX;
          prevY = e.clientY;
          prevT = performance.now();
          vx = 0;
          vy = 0;

          dragging = true;
          window.addEventListener("mouseup", onRelease);
          window.addEventListener("mousemove", onMove);
        }
      }}
      onWheel={(e) => {
        setOffset((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
        return false;
      }}
    >
      <div
        class="absolute"
        style={{
          translate: `${offset().x}px ${offset().y}px`,
        }}
        ref={transformDiv!}
      >
        <div class="border">hello there</div>
      </div>
    </div>
  );
}
