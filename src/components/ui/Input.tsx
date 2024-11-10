import { createSignal, JSX, splitProps } from "solid-js";
type InputProps = {
  defaultValue?: string;
} & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value">;

/** UNCONTROLLED */
export function TextInput(props: InputProps) {
  const [local, rest] = splitProps(props, ["class", "defaultValue"]);

  return (
    <input
      type="text"
      class={`${
        local.class ?? ""
      } min-w-48 w-full bg-back-subtle leading-none px-3 py-2 rounded-md border focus:(outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)`}
      value={local.defaultValue ?? ""}
      {...rest}
    />
  );
}

export function ResizingTextInput(
  props: Omit<InputProps, "onInput"> & {
    onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
  }
) {
  const [local, rest] = splitProps(props, ["onInput"]);
  const [value, setValue] = createSignal(props.defaultValue);

  let sizeRef: HTMLDivElement;

  return (
    <div>
      <TextInput
        {...rest}
        onInput={(e) => {
          setValue(e.target.value);
          local.onInput?.(e);
        }}
      />
      <div ref={sizeRef!} class="invisible h-0 px-3 border-x whitespace-pre">
        {value()}
      </div>
    </div>
  );
}
