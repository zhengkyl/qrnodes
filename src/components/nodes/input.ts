import { generate, QrOptions, Version } from "fuqr";
import type { NodeDef } from "./shared";

export const TextNode = {
  title: "Text",
  inputsDef: {},
  outputDef: {
    type: "string",
    label: "Output",
    props: {
      placeholder: "Enter text...",
    },
  },
  function: () => {
    return "";
  },
} satisfies NodeDef;

export const NumberNode = {
  title: "Number",
  inputsDef: {},
  outputDef: {
    type: "number",
    label: "Output",
  },
  function: () => {
    return 0;
  },
} satisfies NodeDef;

export const QrNode = {
  title: "QR Code",
  inputsDef: {
    text: {
      type: "string",
      label: "Text",
      props: {
        placeholder: "Enter text...",
      },
      initialValue: "hello there",
    },
    minVersion: {
      type: "number",
      label: "Min version",
      props: {
        min: 1,
        max: 40,
      },
      initialValue: 1,
    },
    minEcl: {
      type: "select",
      label: "Min ECL",
      props: {
        options: ["Low", "Medium", "Quartile", "High"],
      },
    },
    mask: {
      type: "select",
      label: "Mask",
      props: {
        options: ["Auto", 0, 1, 2, 3, 4, 5, 6, 7],
      },
    },
  },
  outputDef: {
    type: "qrCode",
    label: "QR Code",
  },
  function: (inputs) => {
    if (inputs.minVersion < 1 || inputs.minVersion > 40) return null;

    const ecl = ["Low", "Medium", "Quartile", "High"];
    let options = new QrOptions()
      .min_version(new Version(inputs.minVersion))
      .min_ecl(ecl.indexOf(inputs.minEcl));
    if (inputs.mask !== "Auto") {
      options = options.mask(inputs.mask);
    }
    return generate(inputs.text, options);
  },
} satisfies NodeDef;
