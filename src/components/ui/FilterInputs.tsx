import { splitProps, type JSX } from "solid-js";

type AnyInputProps = {
  onValue?: (v: any) => void;
  value: { name: string; effects: any[] };
  disabled?: boolean;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function FilterInput(props: AnyInputProps) {
  const [_, rest] = splitProps(props, ["value", "onValue"]);

  return (
    <div
      {...rest}
      classList={{
        "select-none min-w-48 w-full bg-back-subtle text-sm leading-tight px-3 py-2 rounded-md border focus:(outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)":
          true,
        "text-fore-subtle": props.value == null,
      }}
    >
      {props.value != null ? props.value.name : "unset"}
    </div>
  );
}
