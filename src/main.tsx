import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { AuthProvider } from "@/contexts/AuthContext";

/*if (
    (window.location.pathname === "/Playtest64/" ||
        window.location.pathname === "/Playtest64") &&
    window.location.hash === "" &&
    !window.location.search
) {
    window.location.replace("/Playtest64/#/");
}*/

if (
    (window.location.pathname === "/Playtest64/" ||
        window.location.pathname === "/Playtest64") &&
    window.location.hash === "" &&
    !window.location.search
) {
    window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#/${window.location.search}`
    );
}

createRoot(document.getElementById("root")!).render(
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter> 
);
