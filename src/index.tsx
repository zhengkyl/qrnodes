/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";

import "virtual:uno.css";
import "@unocss/reset/tailwind.css";
import "./index.css";

import init from "fuqr";
import initUrl from "fuqr/fuqr_bg.wasm?url";

const root = document.getElementById("root");

// HMR Auto-save implementation
if (import.meta.hot) {
  console.log('🔥 HMR is available - setting up auto-save for dev');
  
  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('🔥 HMR: vite:beforeUpdate - triggering auto-save');
    
    // Dispatch custom event that the app can listen to
    const event = new CustomEvent('hmr:autosave', {
      detail: { timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  });
  
  import.meta.hot.accept();
} else {
  console.log('❌ HMR not available (production mode?)');
}

render(() => <App />, root!);

init(initUrl);
