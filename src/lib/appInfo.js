// Central app identity + release config
export const APP_NAME = "UnGoonify";
export const APP_VERSION = "2.4.0";

// GitHub repo used for update checks (owner/repo).
// Set to your actual repo when you push to GitHub.
export const GITHUB_REPO = "fleziz/UnGoonify";

// Whether this build runs inside the Capacitor Android app
export const IS_NATIVE =
  typeof window !== "undefined" &&
  typeof window.Capacitor !== "undefined" &&
  !!window.Capacitor.isNativePlatform;
