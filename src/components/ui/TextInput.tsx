import { createSignal, JSX, splitProps } from "solid-js";

type InputProps = {
  onValue?: (v: string) => void;
  onInput?: JSX.InputEventHandler<HTMLInputElement, InputEvent>;
} & JSX.InputHTMLAttributes<HTMLInputElement>;

/** UNCONTROLLED */
export function TextInput(props: InputProps) {
  const [local, rest] = splitProps(props, ["class", "onValue", "onInput"]);

  return (
    <input
      {...rest}
      type="text"
      class={`${
        local.class ?? ""
      } min-w-48 w-full bg-back-subtle leading-tight px-3 py-2 rounded-md border focus:(outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)`}
      onInput={(e) => {
        local.onInput?.(e);
        local.onValue?.(e.target.value);
      }}
    />
  );
}

export function ResizingTextInput(props: Omit<InputProps, "onInput">) {
  const [value, setValue] = createSignal(props.value);
  let sizeRef: HTMLDivElement;

  return (
    <div>
      <TextInput
        {...props}
        onInput={(e) => {
          setValue(e.target.value);
        }}
      />
      <div ref={sizeRef!} class="invisible h-0 px-3 border-x whitespace-pre">
        {value()}
      </div>
    </div>
  );
}
