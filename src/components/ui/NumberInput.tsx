import { NumberField } from "@kobalte/core/number-field";
import Plus from "lucide-solid/icons/plus";
import Minus from "lucide-solid/icons/minus";
import MoveHorizontal from "lucide-solid/icons/move-horizontal";
import { createSignal } from "solid-js";

type Props = {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  value: number;
  onValue?: (v: number) => void;
};

export function NumberInput(props: Props) {
  return (
    <NumberField
      class="min-w-48 w-full relative rounded-md bg-back-subtle focus-within:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)"
      minValue={props.min}
      maxValue={props.max}
      step={props.step}
      rawValue={props.value}
      onRawValueChange={(v) => {
        if (Number.isNaN(v)) return;
        props.onValue?.(v);
      }}
      disabled={props.disabled}
    >
      <NumberField.DecrementTrigger
        aria-label="Decrement"
        class="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded disabled:opacity-20"
        disabled={props.disabled}
      >
        <Minus size={12} class="pointer-events-none" />
      </NumberField.DecrementTrigger>
      <NumberField.Input class="w-full text-sm text-center rounded-md px-9 py-2 border bg-transparent focus:outline-none" />
      <NumberField.IncrementTrigger
        aria-label="Increment"
        class="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded disabled:opacity-20"
        disabled={props.disabled}
      >
        <Plus size={12} class="pointer-events-none" />
      </NumberField.IncrementTrigger>
    </NumberField>
  );
}

function decimals(n) {
  const parts = n.toString().split(".");
  if (parts.length < 2) return 0;
  return parts[1].length;
}

export function SliderNumberInput(props: Props) {
  const [rawValue, setRawValue] = createSignal(props.value.toString());
  const [focused, setFocused] = createSignal(false);
  const [sliding, setSliding] = createSignal(false);

  const setValueClamped = (v) => {
    // @ts-expect-error
    if (v < props.min) {
      v = props.min;
      // @ts-expect-error
    } else if (v > props.max) {
      v = props.max;
    }
    if (v === props.value) return;
    props.onValue?.(v);
  };

  // NOTE: props.step will never change
  const decimalDigits = props.step != null ? decimals(props.step) : 0;

  return (
    <div class="relative">
      <input
        classList={{
          "min-w-48 w-full text-sm leading-tight border rounded-md pl-3 pr-8 py-2 bg-back-subtle focus:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base outline-none)":
            true,
          "cursor-ew-resize": sliding(),
        }}
        min={props.min}
        max={props.max}
        step={props.step}
        value={focused() ? rawValue() : props.value.toFixed(decimalDigits)}
        onInput={(e) => {
          setRawValue(e.target.value);
          let v = parseFloat(e.target.value) as any;
          if (Number.isNaN(v)) return;
          setValueClamped(v);
        }}
        onFocus={() => {
          setRawValue(props.value.toFixed(decimalDigits));
          setFocused(true);
        }}
        onBlur={() => {
          setRawValue(props.value.toFixed(decimalDigits));
          setFocused(false);
        }}
        disabled={props.disabled}
      />
      <MoveHorizontal
        size={32}
        classList={{
          "absolute right-0 top-1/2 -translate-y-1/2 p-2 cursor-ew-resize":
            true,
          "opacity-50": !sliding(),
          "opacity-100": sliding(),
        }}
        onPointerDown={(e) => {
          e.stopImmediatePropagation();
          const startX = e.clientX;
          const startValue = props.value;

          const step = props.step ?? 1;
          const onPointerMove = (e) => {
            const steps = Math.round((e.clientX - startX) / 10);
            if (steps === 0) return;
            setValueClamped(startValue + steps * step);
          };
          const onPointerUp = () => {
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            document.body.style.cursor = "";
            setSliding(false);
          };
          document.addEventListener("pointermove", onPointerMove);
          document.addEventListener("pointerup", onPointerUp);
          document.body.style.cursor = "ew-resize";
          setSliding(true);
        }}
      />
    </div>
  );
}
