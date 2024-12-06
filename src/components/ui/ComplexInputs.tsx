import { splitProps, type JSX } from "solid-js";

type InputProps = {
  value: null | any;
  valueKey: string;
  placeholder: string;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function ComplexInput(props: InputProps) {
  const [_, rest] = splitProps(props, ["value"]);

  return (
    <div
      {...rest}
      classList={{
        "select-none min-w-48 w-full bg-back-subtle text-sm leading-tight px-3 py-2 rounded-md border focus:(outline-none ring-2 ring-fore-base ring-offset-2 ring-offset-back-base)":
          true,
        "text-fore-subtle": props.value == null,
      }}
    >
      {props.value != null ? props.value[props.valueKey] : props.placeholder}
    </div>
  );
}

export function FilterEffectInput(props) {
  return (
    <ComplexInput value={props.value} valueKey="name" placeholder="unset" />
  );
}

export function FuncInput(props) {
  return (
    <ComplexInput value={props.value} valueKey="type" placeholder="unset" />
  );
}
