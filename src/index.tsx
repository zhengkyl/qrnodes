/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";

import "virtual:uno.css";
import "@unocss/reset/tailwind.css";
import "./index.css";

const root = document.getElementById("root");

render(() => <App />, root!);
