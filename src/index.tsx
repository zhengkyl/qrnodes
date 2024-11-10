/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";

import "virtual:uno.css";
import "@unocss/reset/tailwind.css";
import "./index.css";

import init from "fuqr";
import initUrl from "fuqr/fuqr_bg.wasm?url";

const root = document.getElementById("root");

render(() => <App />, root!);

init(initUrl);
