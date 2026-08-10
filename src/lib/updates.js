import { GITHUB_REPO, APP_VERSION } from "@/lib/appInfo";

const CACHE_KEY = "healen:update-check";

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

export async function checkForUpdate({ force = false } = {}) {
  if (!GITHUB_REPO || !GITHUB_REPO.includes("/")) return null;

  // Cache the result for this session so we don't hammer the GitHub API on
  // every navigation and so a dismissed update stays dismissed until reload.
  if (!force) {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      /* ignore */
    }
  }

  let result = null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (res.ok) {
      const release = await res.json();
      const tag = release.tag_name || "";
      if (isNewer(tag, APP_VERSION)) {
        const apk = (release.assets || []).find(
          (a) => /\.apk$/i.test(a.name) && /universal|default/i.test(a.name)
        ) || (release.assets || []).find((a) => /\.apk$/i.test(a.name));

        result = {
          available: true,
          version: tag.replace(/^v/, ""),
          releaseUrl: release.html_url,
          downloadUrl: apk ? apk.browser_download_url : release.html_url,
          body: release.body || "",
        };
      }
    }
  } catch (e) {
    result = null;
  }

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch (e) {
    /* ignore */
  }
  return result;
}
