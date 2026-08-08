// Central app identity + release config
export const APP_NAME = "Healen";
export const APP_VERSION = "3.1.2";

// GitHub repo used for update checks (owner/repo).
export const GITHUB_REPO = "pywellsdm/Healen";

// Whether this build runs inside the Capacitor Android app
export const IS_NATIVE =
  typeof window !== "undefined" &&
  typeof window.Capacitor !== "undefined" &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  !!window.Capacitor.isNativePlatform();
