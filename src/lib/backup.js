const PREFIXES = ["quit-gooning:", "reclaim-", "ungoonify-", "healen:"];

function inScope(key) {
  return PREFIXES.some((p) => key.startsWith(p));
}

function uint8ToB64(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function compress(text) {
  if (typeof CompressionStream === "undefined") return b64Encode(text);
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return uint8ToB64(new Uint8Array(buf));
}

async function decompress(b64) {
  if (typeof DecompressionStream === "undefined") return atob(b64);
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

async function b64Encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

async function b64Decode(b64) {
  const binary = atob(b64.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const BACKUP_MAGIC = "HEALEN-BACKUP-1";
const LEGACY_MAGIC = "UNGOONIFY-BACKUP-1";

export async function exportBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (inScope(key)) data[key] = localStorage.getItem(key);
  }
  const payload = `${BACKUP_MAGIC}\n${JSON.stringify(data)}`;
  let body = await b64Encode(payload);
  if (typeof CompressionStream !== "undefined") body = await compress(payload);
  const blob = new Blob([body], { type: "application/octet-stream" });
  return { code: body, blob, size: Object.keys(data).length };
}

export async function importBackup(code) {
  let payload;
  try {
    payload = typeof DecompressionStream !== "undefined"
      ? await decompress(code)
      : await b64Decode(code);
  } catch (e) {
    payload = await b64Decode(code);
  }
  const nl = payload.indexOf("\n");
  const magic = payload.slice(0, nl);
  if (magic !== BACKUP_MAGIC && magic !== "HEALEN-BACKUP-1" && magic !== LEGACY_MAGIC) {
    throw new Error("Not a valid Healen backup.");
  }
  const data = JSON.parse(payload.slice(nl + 1));
  if (!data || typeof data !== "object") {
    throw new Error("Backup is empty or corrupt.");
  }
  Object.keys(data).forEach((key) => {
    localStorage.setItem(key, data[key]);
  });
  return { keys: Object.keys(data).length };
}
