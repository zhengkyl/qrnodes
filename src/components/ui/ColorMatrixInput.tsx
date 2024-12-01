import { NumberField } from "@kobalte/core/number-field";
import { Index } from "solid-js";

type Props = {
  value: number[];
  onValue: (v: number[]) => void;
};

export function ColorMatrixInput(props: Props) {
  return (
    <div class="grid grid-cols-5 gap-1 min-w-64">
      <Index each={Array.from({ length: 20 })}>
        {(_, i) => {
          return (
            <NumberField
              class="relative rounded-md bg-back-subtle focus-within:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)"
              rawValue={props.value[i]}
              onRawValueChange={(v) => {
                if (Number.isNaN(v)) return;
                const newValue = props.value.slice();
                newValue[i] = v;
                props.onValue(newValue);
              }}
            >
              <NumberField.Input class="w-full text-sm text-center rounded-md py-2 border bg-transparent focus:outline-none" />
            </NumberField>
          );
        }}
      </Index>
    </div>
  );
}
