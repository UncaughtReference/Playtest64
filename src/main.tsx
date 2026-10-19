import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { AuthProvider } from "@/contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter> 
);
