import { NumberField } from "@kobalte/core/number-field";
import Plus from "lucide-solid/icons/plus";
import Minus from "lucide-solid/icons/minus";

type Props = {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  value?: number;
  onValue?: (v: number) => void;
};

export function NumberInput(props: Props) {
  return (
    <NumberField
      class="min-w-48 w-full relative rounded-md bg-back-subtle focus-within:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)"
      minValue={props.min}
      maxValue={props.max}
      step={1}
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
