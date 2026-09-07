import { GITHUB_REPO, APP_VERSION } from "@/lib/appInfo";

const CACHE_KEY = "healen:update-check";
const VERSION_KEY = "healen:last-checked-version";
const CACHE_TTL = 10 * 60 * 1000; // re-check at most every 10 minutes

function parseVersion(v) {
  const s = String(v || "").replace(/^v/, "").trim();
  const parts = s.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

// Clear the update cache when the app version changes (e.g. after installing a
// new build) so the banner always re-checks against the fresh release.
function invalidateCacheOnVersionChange() {
  try {
    const lastVersion = localStorage.getItem(VERSION_KEY);
    if (lastVersion !== APP_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  } catch {
    /* ignore */
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.at) return undefined;
    if (Date.now() - parsed.at > CACHE_TTL) return undefined;
    return parsed.result;
  } catch {
    return undefined;
  }
}

function writeCache(result) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), result }));
  } catch {
    /* ignore */
  }
}

async function fetchLatestRelease() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
    );
    if (res.ok) return await res.json();
  } catch {
    /* fall through to package.json fallback */
  }
  return null;
}

async function fetchRepoVersion() {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const pkg = await res.json();
      if (pkg.version) return `v${pkg.version}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function checkForUpdate({ force = false } = {}) {
  if (!GITHUB_REPO || !GITHUB_REPO.includes("/")) return null;

  // Always invalidate stale cache when the app version changes
  invalidateCacheOnVersionChange();

  if (!force) {
    const cached = readCache();
    if (cached !== undefined) return cached;
  }

  let release = null;
  let latestVersion = null;
  release = await fetchLatestRelease();
  if (release?.tag_name) latestVersion = release.tag_name;

  // Fallback: if the GitHub API is unavailable or rate-limited (no release
  // returned at all), try the repo's package.json.  We intentionally skip this
  // when the release *was* fetched but its version is not newer, because the
  // package.json on main often contains an unreleased dev version bump that
  // would trigger a false "update available" popup.
  if (!latestVersion) {
    const repoVersion = await fetchRepoVersion();
    if (repoVersion) {
      latestVersion = repoVersion;
    }
  }

  let result = null;
  if (latestVersion && isNewer(latestVersion, APP_VERSION)) {
    // Find the APK asset — match any .apk file (the release script names them
    // Healen-vX.Y.Z.apk, but we also accept any other .apk as fallback).
    const apk =
      (release?.assets || []).find((a) => /\.apk$/i.test(a.name));
    const fallbackUrl = `https://github.com/${GITHUB_REPO}/releases/tag/${latestVersion}`;
    result = {
      available: true,
      version: latestVersion.replace(/^v/, ""),
      releaseUrl: release?.html_url || fallbackUrl,
      downloadUrl: apk ? apk.browser_download_url : fallbackUrl,
      body: release?.body || "",
    };
  }

  writeCache(result);
  return result;
}
