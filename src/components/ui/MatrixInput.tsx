import { NumberField } from "@kobalte/core/number-field";
import { Index } from "solid-js";

type Props = {
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValue: (v: number[]) => void;
  rows: number;
  columns: number;
};

export function MatrixInput(props: Props) {
  return (
    <div class="flex flex-col gap-1">
      <Index each={Array.from({ length: props.rows })}>
        {(_, i) => (
          <div class="flex gap-1">
            <Index each={Array.from({ length: props.columns })}>
              {(_, j) => {
                const index = i * props.columns + j;
                return (
                  <NumberField
                    class="min-w-12 relative rounded-md bg-back-subtle focus-within:(ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)"
                    rawValue={props.value[index]}
                    onRawValueChange={(v) => {
                      if (Number.isNaN(v)) return;
                      const newValue = props.value.slice();
                      newValue[index] = v;
                      props.onValue(newValue);
                    }}
                  >
                    <NumberField.Input class="w-full text-sm text-center rounded-md py-2 border bg-transparent focus:outline-none" />
                  </NumberField>
                );
              }}
            </Index>
          </div>
        )}
      </Index>
    </div>
  );
}
