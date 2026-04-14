import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import "./theme/theme.css";
import "./app/globals.css";
import "./app/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
