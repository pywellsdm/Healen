import { GITHUB_REPO, APP_VERSION } from "@/lib/appInfo";

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

export async function checkForUpdate() {
  if (!GITHUB_REPO || !GITHUB_REPO.includes("/")) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return null;
    const release = await res.json();
    const tag = release.tag_name || "";
    if (!isNewer(tag, APP_VERSION)) return null;

    const apk = (release.assets || []).find(
      (a) => /\.apk$/i.test(a.name) && /universal|default/i.test(a.name)
    ) || (release.assets || []).find((a) => /\.apk$/i.test(a.name));

    return {
      available: true,
      version: tag.replace(/^v/, ""),
      releaseUrl: release.html_url,
      downloadUrl: apk ? apk.browser_download_url : release.html_url,
      body: release.body || "",
    };
  } catch (e) {
    return null;
  }
}
