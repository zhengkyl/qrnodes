import { generate, QrOptions, Version } from "fuqr";
import { fromHtml } from "hast-util-from-html";
import { s } from "hastscript";
import type { NodeDef } from "./shared";

export const TextNode = {
  title: "Text",
  inputsDef: {
    text: {
      type: "string",
      label: "Text",
      props: {
        placeholder: "Enter text...",
      },
    },
  },
  outputDef: {
    type: "string",
    label: "",
    connector: "lastInput",
  },
  function: (inputs) => {
    return inputs.text;
  },
} satisfies NodeDef;

export const NumberNode = {
  title: "Number",
  inputsDef: {
    number: {
      type: "number",
      label: "Number",
    },
  },
  outputDef: {
    type: "number",
    label: "",
    connector: "lastInput",
  },
  function: (inputs) => {
    return inputs.number;
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
    type: "qr_code",
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

export const SvgStringNode = {
  title: "SVG string",
  inputsDef: {
    string: {
      type: "textarea",
      label: "string",
    },
  },
  outputDef: {
    type: "hast",
    label: "SVG AST",
  },
  function: (inputs) => {
    if (!inputs.string) return null;
    return fromHtml(inputs.string, { space: "svg", fragment: true })
      .children[0];
  },
} satisfies NodeDef;

export const SquareNode = {
  title: "Square",
  inputsDef: {
    width: {
      type: "number",
      label: "width",
    },
    height: {
      type: "number",
      label: "height",
    },
    rx: {
      type: "number",
      label: "rx",
    },
    ry: {
      type: "number",
      label: "ry",
    },
    x: {
      type: "number",
      label: "x",
    },
    y: {
      type: "number",
      label: "y",
    },
  },
  outputDef: {
    type: "hast",
    label: "SVG AST",
  },
  function: (inputs) => {
    if (!inputs.width || !inputs.height) return null;
    return s(
      "svg",
      {
        viewBox: `0 0 ${inputs.width} ${inputs.height}`,
      },
      [
        s("rect", {
          width: inputs.width,
          height: inputs.height,
          rx: inputs.rx,
          ry: inputs.ry,
          x: inputs.x,
          y: inputs.y,
        }),
      ]
    );
  },
} satisfies NodeDef;

export const CircleNode = {
  title: "Circle",
  inputsDef: {
    radius: {
      type: "number",
      label: "radius",
    },
    x: {
      type: "number",
      label: "x",
    },
    y: {
      type: "number",
      label: "y",
    },
  },
  outputDef: {
    type: "hast",
    label: "SVG AST",
  },
  function: (inputs) => {
    if (!inputs.radius) return null;
    return s(
      "svg",
      {
        viewBox: `0 0 ${inputs.radius * 2} ${inputs.radius * 2}`,
      },
      [
        s("circle", {
          cx: inputs.x,
          cy: inputs.y,
          r: inputs.radius,
        }),
      ]
    );
  },
} satisfies NodeDef;

export const WebGLCanvasNode = {
  title: "WebGL Canvas",
  inputsDef: {
    vertexShader: {
      type: "textarea",
      label: "Vertex Shader",
    },
    fragmentShader: {
      type: "textarea",
      label: "Fragment Shader",
    },
  },
  outputDef: {
    type: "string",
    label: "Data URL",
  },
  function: (inputs) => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) return null;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const program = initShaderProgram(
      gl,
      inputs.vertexShader,
      inputs.fragmentShader
    );
    if (!program) return null;

    const programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
      },
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    return canvas.toDataURL();
  },
} satisfies NodeDef;

function initShaderProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initBuffers(gl: WebGLRenderingContext) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positionData = [1, 1, -1, 1, 1, -1, -1, -1];
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(positionData),
    gl.STATIC_DRAW
  );

  return {
    positionBuffer,
  };
}
