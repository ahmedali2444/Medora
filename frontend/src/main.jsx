import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./index.css";
import "./i18n";
import { createBuildRefreshUrl, stripBuildVersionParam } from "./utils/buildRefresh";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "dummy-client-id.apps.googleusercontent.com";

function cleanBuildVersionParam() {
  if (typeof window === "undefined") return;

  const nextUrl = stripBuildVersionParam(window.location.href);
  if (nextUrl === window.location.href) return;

  window.history.replaceState(window.history.state, "", nextUrl);
}

function registerBuildRefresh() {
  cleanBuildVersionParam();

  if (!import.meta.env.PROD || typeof window === "undefined") return;

  const currentBuildId = window.__MEDORA_BUILD_ID__ || document.querySelector('meta[name="medora-build"]')?.content;
  if (!currentBuildId) return;

  const storageKey = "medora-build-id";
  const refreshKey = "medora-build-refresh-id";
  window.localStorage.setItem(storageKey, currentBuildId);

  const refreshForBuild = (buildId) => {
    if (window.sessionStorage.getItem(refreshKey) === buildId) return;
    window.sessionStorage.setItem(refreshKey, buildId);
    window.location.replace(createBuildRefreshUrl(window.location.href, buildId));
  };

  const checkForNewBuild = async () => {
    try {
      const response = await fetch(`/version.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.buildId && data.buildId !== currentBuildId) {
        window.localStorage.setItem(storageKey, data.buildId);
        refreshForBuild(data.buildId);
      }
    } catch {
      // Version checks should never interrupt normal app usage.
    }
  };

  window.addEventListener("focus", checkForNewBuild);
  window.setInterval(checkForNewBuild, 10 * 60 * 1000);
}

registerBuildRefresh();

// BUG-F2: AuthProvider moved inside App.jsx (inside BrowserRouter) so it can use useNavigate
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId} locale="en">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

window.__MEDORA_CACHE_BUST__ = Date.now(); // 4
