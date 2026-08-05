// Central app identity + release config
export const APP_NAME = "UnGoonify";
export const APP_VERSION = "2.7.0";

// GitHub repo used for update checks (owner/repo).
export const GITHUB_REPO = "pywellsdm/UnGoonify";

// Whether this build runs inside the Capacitor Android app
export const IS_NATIVE =
  typeof window !== "undefined" &&
  typeof window.Capacitor !== "undefined" &&
  !!window.Capacitor.isNativePlatform;
