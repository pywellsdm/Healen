// Theme engine: computes a full accent palette from a base color (hex) and
// emits concrete CSS custom properties. Handles achromatic colors (black,
// white, grays) so neutral bases stay neutral — no magic hue artifacts.

export function hexToRgb(hex) {
  const raw = String(hex || "").trim();
  let m = raw;
  if (raw.startsWith("#")) {
    m = raw.replace(/^#/, "");
    if (m.length === 3) m = m.split("").map((c) => c + c).join("");
  } else if (raw.startsWith("rgb")) {
    const match = raw.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    if (match) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
    return { r: 99, g: 102, b: 241 };
  }
  const int = parseInt(m.slice(0, 6), 16);
  if (!Number.isFinite(int)) return { r: 99, g: 102, b: 241 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h: Math.round(h),
    s: Math.round(Math.min(1, s) * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const hp = h / 60;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const ACHROM_THRESHOLD = 8;

// Derive a full palette from a base color. For chromatic colors the accent is
// kept deep/vivid; for achromatic (black/white/gray) everything stays neutral
// so nothing snaps to an arbitrary hue (the old "black becomes purple" bug).
export function resolveAccentColors(hex) {
  const { h, s: sat0, l: lit0 } = hexToHsl(hex || "#6366f1");
  const achrom = sat0 <= ACHROM_THRESHOLD;

  let accent;
  let bright;
  let dim;
  let strong;
  let secondary;
  let secondaryStrong;
  let contrast;

  if (achrom) {
    const L = lit0;
    accent = hslToHex(0, 0, L);
    bright = hslToHex(0, 0, Math.max(78, Math.min(94, L)));
    dim = hslToHex(0, 0, Math.max(66, Math.min(88, L * 0.95)));
    strong = hslToHex(0, 0, Math.max(0, Math.min(36, L * 0.55)));
    secondary = hslToHex(0, 0, Math.max(72, Math.min(92, L)));
    secondaryStrong = hslToHex(0, 0, Math.max(18, Math.min(40, L * 0.6)));
    contrast = L >= 55 ? "#0b0d18" : "#f1f5f9";
  } else {
    const s = Math.min(95, Math.max(58, sat0));
    const lFill = Math.max(44, Math.min(58, Math.round(lit0 * 0.62)));
    accent = hslToHex(h, s, lFill);
    bright = hslToHex(h, s, Math.max(74, Math.min(88, lit0 + 16)));
    dim = hslToHex(h, s, Math.max(58, Math.min(74, lit0 + 6)));
    strong = hslToHex(h, s, Math.max(24, Math.min(40, lFill - 16)));
    secondary = hslToHex((h + 40) % 360, Math.min(92, s + 4), Math.max(58, Math.min(78, lit0 + 8)));
    secondaryStrong = hslToHex((h + 40) % 360, Math.min(92, s + 4), Math.max(20, Math.min(40, lFill - 14)));
    contrast = lFill >= 55 ? "#0b0d18" : "#f1f5f9";
  }

  return {
    h,
    achrom,
    accent,
    bright,
    dim,
    strong,
    secondary,
    secondaryStrong,
    contrast,
    glow: rgba(bright, 0.35),
    glowStrong: rgba(bright, 0.6),
    glowDeep: rgba(strong, 0.38),
  };
}

// Concrete CSS custom properties for the whole app.
export function buildThemeVars(c) {
  return {
    "--accent-hue": String(c.h),
    "--accent": c.accent,
    "--accent-bright": c.bright,
    "--accent-dim": c.dim,
    "--accent-strong": c.strong,
    "--accent-secondary": c.secondary,
    "--accent-secondary-strong": c.secondaryStrong,
    "--accent-contrast": c.contrast,
    "--accent-glow": c.glow,
    "--accent-glow-strong": c.glowStrong,
    "--accent-glow-deep": c.glowDeep,
    "--accent-10": rgba(c.accent, 0.1),
    "--accent-15": rgba(c.accent, 0.15),
    "--accent-20": rgba(c.accent, 0.2),
    "--accent-25": rgba(c.accent, 0.25),
    "--accent-30": rgba(c.accent, 0.3),
    "--accent-40": rgba(c.accent, 0.4),
    "--accent-50": rgba(c.accent, 0.5),
    "--accent-bright-70": rgba(c.bright, 0.7),
    "--accent-bright-80": rgba(c.bright, 0.8),
    "--accent-secondary-10": rgba(c.secondary, 0.1),
    "--accent-secondary-20": rgba(c.secondary, 0.2),
    "--accent-secondary-30": rgba(c.secondary, 0.3),
    "--accent-secondary-40": rgba(c.secondary, 0.4),
    "--accent-secondary-strong-10": rgba(c.secondaryStrong, 0.1),
    "--accent-secondary-strong-20": rgba(c.secondaryStrong, 0.2),
    "--accent-secondary-strong-30": rgba(c.secondaryStrong, 0.3),
    "--ambient-1": rgba(c.bright, 0.14),
    "--ambient-2": rgba(c.secondary, 0.1),
    "--ambient-3": rgba(c.secondary, 0.07),
    "--chess-light": rgba(c.bright, 0.16),
    "--chess-dark": rgba(c.strong, 0.52),
    "--chess-selected": rgba(c.bright, 0.55),
    "--chess-last": rgba(c.bright, 0.26),
    "--chess-dot": rgba(c.bright, 0.9),
    "--chess-capture": rgba(c.secondary, 0.75),
    "--chess-check": "rgba(220,38,38,0.55)",
  };
}

export function applyThemeToRoot(root, hex) {
  const vars = buildThemeVars(resolveAccentColors(hex));
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

// Read the currently applied theme colors from CSS vars (used by charts that
// need concrete values). Always returns valid CSS color strings.
export function readThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (k) => (cs.getPropertyValue(k) || "").trim();
  return {
    accent: get("--accent") || "#6366f1",
    bright: get("--accent-bright") || "#c7d2fe",
    dim: get("--accent-dim") || "#a5b4fc",
    strong: get("--accent-strong") || "#4338ca",
    secondary: get("--accent-secondary") || "#a78bfa",
    secondaryStrong: get("--accent-secondary-strong") || "#6d28d9",
  };
}

// A set of chart colors derived from the current accent. Neutral themes get a
// tuned gray ramp; chromatic themes rotate the hue for variety.
export function buildChartPalette(colors) {
  const { h, s, l } = hexToHsl(colors.accent);
  const achrom = s <= ACHROM_THRESHOLD;
  if (achrom) {
    return [
      colors.bright,
      colors.dim,
      colors.accent,
      colors.strong,
      hslToHex(0, 0, 90),
      hslToHex(0, 0, 74),
      hslToHex(0, 0, 58),
      hslToHex(0, 0, 40),
    ];
  }
  return [
    colors.accent,
    colors.secondary,
    hslToHex((h + 55) % 360, s, Math.min(70, l + 8)),
    hslToHex((h + 110) % 360, s, 62),
    hslToHex((h + 165) % 360, s, 55),
    hslToHex((h + 220) % 360, s, 60),
    colors.bright,
    hslToHex((h + 275) % 360, s, 50),
  ];
}