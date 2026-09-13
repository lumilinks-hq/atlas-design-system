// design/tokens.json の色（oklch / hex）から WCAG 2.x のコントラスト比を計算する純粋関数。
// oklch → OKLab → LMS → 線形 sRGB → 相対輝度 → 比率の順に変換する。

export type LinearRgb = [number, number, number];

export type ContrastRow = {
  foreground: string;
  background: string;
  ratio: number;
  /** 4.5: 通常の文字（AA）、3: 非テキストの UI 要素（AA、WCAG 1.4.11） */
  threshold: 3 | 4.5;
  passes: boolean;
};

function srgbToLinear(channel: number) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseHex(hex: string): LinearRgb {
  const body = hex.slice(1);
  const full = body.length === 3 ? body.split("").map((c) => c + c).join("") : body;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) throw new Error(`hex 色を解釈できません: ${hex}`);
  const channels = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
  return channels.map(srgbToLinear) as LinearRgb;
}

function parseOklch(value: string): LinearRgb {
  const match = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/i.exec(value);
  if (!match) throw new Error(`oklch 色を解釈できません: ${value}`);
  const lightness = value.includes("%") ? Number(match[1]) / 100 : Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  // OKLab → LMS（立方根空間）
  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  // LMS → 線形 sRGB
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** CSS の色文字列（#hex または oklch()）を線形 sRGB に変換する */
export function parseColor(value: string): LinearRgb {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (trimmed.toLowerCase().startsWith("oklch(")) return parseOklch(trimmed);
  throw new Error(`対応していない色の形式です: ${value}`);
}

/** WCAG の相対輝度（0〜1） */
export function relativeLuminance(value: string) {
  const [r, g, b] = parseColor(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG のコントラスト比（1〜21）。前景と背景の順序には依存しない */
export function contrastRatio(foreground: string, background: string) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

const textForegrounds = ["text", "textMuted", "accent", "success", "warning", "danger"] as const;
const pageBackgrounds = ["background", "surface", "surfaceMuted"] as const;
const filledBackgrounds = ["accent", "success", "warning", "danger"] as const;

/**
 * Atlas が保証する前景/背景の組み合わせと判定。
 * 文字は 4.5、focus リングは非テキストとして 3.0 を基準にする。
 */
export function contrastReport(color: Record<string, string>): ContrastRow[] {
  const pairs: Array<{ foreground: string; background: string; threshold: 3 | 4.5 }> = [];
  for (const foreground of textForegrounds) {
    for (const background of pageBackgrounds) pairs.push({ foreground, background, threshold: 4.5 });
  }
  for (const foreground of ["text", "accent"]) pairs.push({ foreground, background: "accentSoft", threshold: 4.5 });
  for (const background of filledBackgrounds) pairs.push({ foreground: "surface", background, threshold: 4.5 });
  for (const background of pageBackgrounds) pairs.push({ foreground: "focus", background, threshold: 3 });

  return pairs.flatMap((pair) => {
    const foreground = color[pair.foreground];
    const background = color[pair.background];
    if (foreground === undefined || background === undefined) return [];
    const ratio = contrastRatio(foreground, background);
    return [{ ...pair, ratio, passes: ratio >= pair.threshold }];
  });
}
