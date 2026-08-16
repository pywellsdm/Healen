import { GITHUB_REPO, APP_VERSION } from "@/lib/appInfo";

const CACHE_KEY = "healen:update-check";
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

// Short-lived cache so a dismissed update stays quiet for a few minutes but a
// freshly released version is never missed (old builds cached this forever in
// sessionStorage, which is why the popup stopped appearing).
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.at) return undefined;
    if (Date.now() - parsed.at > CACHE_TTL) return undefined;
    return parsed.result;
  } catch (e) {
    return undefined;
  }
}

function writeCache(result) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), result }));
  } catch (e) {
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
  } catch (e) {
    /* fall through to package.json fallback */
  }
  return null;
}

// Fallback that never rate-limits: read the committed version straight from
// the repo's package.json on the main branch.
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
  } catch (e) {
    /* ignore */
  }
  return null;
}

export async function checkForUpdate({ force = false } = {}) {
  if (!GITHUB_REPO || !GITHUB_REPO.includes("/")) return null;

  if (!force) {
    const cached = readCache();
    if (cached !== undefined) return cached;
  }

  let release = null;
  let latestVersion = null;
  release = await fetchLatestRelease();
  if (release?.tag_name) latestVersion = release.tag_name;

  // If the API is unavailable/rate-limited, use the repo's package.json.
  if (!latestVersion || !isNewer(latestVersion, APP_VERSION)) {
    const repoVersion = await fetchRepoVersion();
    if (repoVersion && (!latestVersion || isNewer(repoVersion, latestVersion))) {
      latestVersion = repoVersion;
    }
  }

  let result = null;
  if (latestVersion && isNewer(latestVersion, APP_VERSION)) {
    const apk =
      (release?.assets || []).find(
        (a) => /\.apk$/i.test(a.name) && /universal|default/i.test(a.name)
      ) ||
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
