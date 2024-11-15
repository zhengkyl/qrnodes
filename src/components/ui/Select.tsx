import { Select as KSelect } from "@kobalte/core/select";
import ChevronsUpDown from "lucide-solid/icons/chevrons-up-down";
import { createSignal } from "solid-js";

type Props = {
  value: string;
  onValue: (v: string) => void;
  options: string[];
};

export function Select(props: Props) {
  // props.value changes on focus/highlight for quick preview
  // but the old value should be restored on esc/unfocus
  const [retainedValue, setRetainedValue] = createSignal(props.value);
  return (
    <KSelect
      value={retainedValue()}
      onChange={(v) => {
        if (v != null) {
          props.onValue(v);
          setRetainedValue(v);
        }
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen && props.value !== retainedValue()) {
          props.onValue(retainedValue());
        }
      }}
      onKeyDown={(e) => {
        const index = props.options.indexOf(props.value);
        switch (e.key) {
          case "ArrowDown":
            props.onValue(
              props.options[Math.min(index + 1, props.options.length - 1)]
            );
            break;
          case "ArrowUp":
            props.onValue(props.options[Math.max(index - 1, 0)]);
            break;
          case "Home":
            props.onValue(props.options[0]);
            break;
          case "End":
            props.onValue(props.options[props.options.length - 1]);
            break;
        }
      }}
      class="min-w-48 w-full"
      options={props.options}
      gutter={4}
      itemComponent={(itemProps) => (
        <KSelect.Item
          class="flex justify-between items-center p-2 rounded select-none data-[highlighted]:(bg-fore-base/10 outline-none)"
          item={itemProps.item}
          onMouseEnter={() => {
            props.onValue(itemProps.item.key);
          }}
        >
          <KSelect.Label>{itemProps.item.rawValue}</KSelect.Label>
          <KSelect.ItemIndicator>
            <svg
              class="-me-1"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="4" />
            </svg>
          </KSelect.ItemIndicator>
        </KSelect.Item>
      )}
    >
      <KSelect.Trigger class="leading-tight w-full inline-flex justify-between items-center gap-1 rounded-md border pl-3 pr-2 py-2 focus:(outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)">
        <KSelect.Value>
          {(state) => state.selectedOption() as string}
        </KSelect.Value>
        <KSelect.Icon>
          <ChevronsUpDown size={16} />
        </KSelect.Icon>
      </KSelect.Trigger>
      <KSelect.Portal>
        <KSelect.Content class="leading-tight bg-back-subtle text-white rounded-md border p-1">
          <KSelect.Listbox />
        </KSelect.Content>
      </KSelect.Portal>
    </KSelect>
  );
}
