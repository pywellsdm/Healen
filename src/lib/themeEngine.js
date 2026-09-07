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

// Semantic color tiers. Each icon/stat/chart uses one of these shades so the
// WHOLE app follows a single accent hue — danger, warning, success and info
// are just darker/lighter shades of the same color, never unrelated hues.
// For achromatic (black/white/gray) themes the tiers become a neutral gray
// ramp tuned for visibility on the dark app background.
export function resolveAccentColors(hex) {
  const { h, s: sat0, l: lit0 } = hexToHsl(hex || "#6366f1");
  const achrom = sat0 <= ACHROM_THRESHOLD;
  // True White theme = light mode; True Black / chromatic = dark mode.
  const mode = achrom && lit0 > 50 ? "light" : "dark";

  let accent;
  let bright;
  let dim;
  let strong;
  let secondary;
  let secondaryStrong;
  let contrast;
  let shadeDeep;
  let shadeDark;
  let shadeMid;
  let shadeBright;
  let shadeSoft;
  let shadePale;
  let sat;

  if (achrom) {
    sat = 0;
    if (mode === "light") {
      // TRUE WHITE THEME: clean light UI, neutral ink accents that read on white.
      accent = hslToHex(0, 0, 14);          // near-black ink
      bright = hslToHex(0, 0, 34);          // dark steel
      dim = hslToHex(0, 0, 48);             // mid gray
      strong = hslToHex(0, 0, 8);
      secondary = hslToHex(0, 0, 38);
      secondaryStrong = hslToHex(0, 0, 20);
      contrast = "#ffffff";
      shadeDeep = hslToHex(0, 0, 22);        // ink for danger
      shadeDark = hslToHex(0, 0, 38);
      shadeMid = hslToHex(0, 0, 52);
      shadeBright = hslToHex(0, 0, 30);
      shadeSoft = hslToHex(0, 0, 44);
      shadePale = hslToHex(0, 0, 58);
    } else {
      // TRUE BLACK THEME: deep black UI, light neutral accents.
      accent = hslToHex(0, 0, 92);          // light ink
      bright = hslToHex(0, 0, 88);
      dim = hslToHex(0, 0, 74);
      strong = hslToHex(0, 0, 60);
      secondary = hslToHex(0, 0, 82);
      secondaryStrong = hslToHex(0, 0, 50);
      contrast = "#0b0d18";
      shadeDeep = hslToHex(0, 0, 74);
      shadeDark = hslToHex(0, 0, 80);
      shadeMid = hslToHex(0, 0, 86);
      shadeBright = hslToHex(0, 0, 92);
      shadeSoft = hslToHex(0, 0, 96);
      shadePale = "#ffffff";
    }
  } else {
    // Preserve the chosen color: accent keeps the picked lightness & saturation
    // so a dark green STAYS dark green (no clamps that collapse everything to
    // a mid/light tone). Offshoots track the pick by +/− lightness.
    const s = Math.min(96, Math.max(sat0, 10));
    const L = lit0;
    sat = s;
    accent = hslToHex(h, s, L);
    bright = hslToHex(h, s, Math.min(92, Math.max(26, L + 16)));
    dim = hslToHex(h, s, Math.min(88, Math.max(20, L + 4)));
    strong = hslToHex(h, s, Math.min(38, Math.max(10, L - 26)));
    secondary = hslToHex(h, s, Math.min(90, Math.max(24, L + 8)));
    secondaryStrong = hslToHex(h, s, Math.min(34, Math.max(8, L - 18)));
    contrast = L >= 55 ? "#0b0d18" : "#f1f5f9";
    // One hue, five lightness tiers — danger/warning/success/info are all
    // this same accent colour, just progressively lighter.
    shadeDeep = hslToHex(h, s, 40);
    shadeDark = hslToHex(h, s, 50);
    shadeMid = hslToHex(h, s, 60);
    shadeBright = hslToHex(h, s, 70);
    shadeSoft = hslToHex(h, s, 80);
    shadePale = hslToHex(h, s, 90);
  }

  return {
    h,
    achrom,
    mode,
    sat,
    accent,
    bright,
    dim,
    strong,
    secondary,
    secondaryStrong,
    contrast,
    shadeDeep,
    shadeDark,
    shadeMid,
    shadeBright,
    shadeSoft,
    shadePale,
    glow: rgba(bright, 0.35),
    glowStrong: rgba(bright, 0.6),
    glowDeep: rgba(strong, 0.38),
  };
}

// Concrete CSS custom properties for the whole app.
export function buildThemeVars(c) {
  return {
    "--accent-hue": String(c.h),
    "--accent-sat": String(c.sat),
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
    // semantic single-hue shade tiers (--sem-*)
    "--sem-deep": c.shadeDeep,
    "--sem-dark": c.shadeDark,
    "--sem-mid": c.shadeMid,
    "--sem-bright": c.shadeBright,
    "--sem-soft": c.shadeSoft,
    "--sem-pale": c.shadePale,
    "--sem-deep-30": rgba(c.shadeDeep, 0.3),
    "--sem-deep-20": rgba(c.shadeDeep, 0.2),
    "--sem-deep-15": rgba(c.shadeDeep, 0.15),
    "--sem-deep-10": rgba(c.shadeDeep, 0.1),
    "--sem-dark-30": rgba(c.shadeDark, 0.3),
    "--sem-dark-20": rgba(c.shadeDark, 0.2),
    "--sem-dark-15": rgba(c.shadeDark, 0.15),
    "--sem-dark-10": rgba(c.shadeDark, 0.1),
    "--sem-mid-40": rgba(c.shadeMid, 0.4),
    "--sem-mid-20": rgba(c.shadeMid, 0.2),
    "--sem-mid-10": rgba(c.shadeMid, 0.1),
    "--sem-bright-40": rgba(c.shadeBright, 0.4),
    "--sem-bright-20": rgba(c.shadeBright, 0.2),
    "--sem-bright-10": rgba(c.shadeBright, 0.1),
    "--sem-soft-30": rgba(c.shadeSoft, 0.3),
    "--sem-soft-20": rgba(c.shadeSoft, 0.2),
    "--sem-soft-10": rgba(c.shadeSoft, 0.1),
    "--sem-pale-30": rgba(c.shadePale, 0.3),
    "--sem-pale-10": rgba(c.shadePale, 0.1),
    // neutral ramp for -50 pastel backgrounds & text-slate variants
    "--sem-dark-bg": rgba(c.shadeDark, 0.08),
    "--sem-dark-bg-strong": rgba(c.shadeDark, 0.16),
    "--ambient-1": rgba(c.bright, 0.14),
    "--ambient-2": rgba(c.secondary, 0.1),
    "--ambient-3": rgba(c.secondary, 0.07),
    "--chess-light": rgba(c.bright, 0.16),
    "--chess-dark": rgba(c.strong, 0.52),
    "--chess-selected": rgba(c.bright, 0.55),
    "--chess-last": rgba(c.bright, 0.26),
    "--chess-dot": rgba(c.bright, 0.9),
    "--chess-capture": rgba(c.secondary, 0.75),
    "--chess-check": rgba(c.shadeDeep, 0.6),
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
    semDeep: get("--sem-deep") || "#4338ca",
    semDark: get("--sem-dark") || "#6057dd",
    semMid: get("--sem-mid") || "#7f80f2",
    semBright: get("--sem-bright") || "#a5b4fc",
    semSoft: get("--sem-soft") || "#cdd3ff",
    semPale: get("--sem-pale") || "#eef0ff",
  };
}

// A single-hue chart palette derived from the current accent — every slice is
// the same colour at a different lightness, so the whole chart stays themed.
export function buildChartPalette(colors) {
  return [
    colors.semDeep,
    colors.semDark,
    colors.semMid,
    colors.semBright,
    colors.semSoft,
    colors.accent,
    colors.bright,
    colors.semPale,
  ];
}