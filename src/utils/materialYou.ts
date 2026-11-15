import { SponsorCategory, SponsorCategorySetting } from '../types/music';

export const DEFAULT_SPONSORBLOCK_SETTINGS: Record<SponsorCategory, SponsorCategorySetting> = {
  music_offtopic: {
    category: 'music_offtopic',
    label: 'Non-Music Section',
    description: 'Skits, long movie intros/outros, or silence in music videos',
    color: '#ff2a85',
    behavior: 'autoskip',
  },
  sponsor: {
    category: 'sponsor',
    label: 'Sponsor',
    description: 'Paid promotion, paid referrals and direct advertisements',
    color: '#00d400',
    behavior: 'autoskip',
  },
  intro: {
    category: 'intro',
    label: 'Intermission / Intro',
    description: 'An interval without actual music content or title animation',
    color: '#00e5ff',
    behavior: 'autoskip',
  },
  outro: {
    category: 'outro',
    label: 'Endcards / Credits',
    description: 'Credits or when the song concludes with subscribe cards',
    color: '#3b82f6',
    behavior: 'autoskip',
  },
  selfpromo: {
    category: 'selfpromo',
    label: 'Unpaid / Self Promo',
    description: 'Merchandise, tour dates, or channel promotion',
    color: '#facc15',
    behavior: 'autoskip',
  },
  interaction: {
    category: 'interaction',
    label: 'Interaction Reminder',
    description: 'Reminders to like, subscribe, or follow',
    color: '#c084fc',
    behavior: 'manual',
  },
  preview: {
    category: 'preview',
    label: 'Preview / Recap',
    description: 'Collection of clips showing what is coming up',
    color: '#38bdf8',
    behavior: 'seekbar',
  },
};

// Convert HSL to space-separated RGB string "R G B" for Tailwind CSS variables
function hslToRgbTuple(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

function rgbStr(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgbTuple(h, s, l);
  return `${r} ${g} ${b}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Generate Material You (M3 Expressive Dark) CSS variables from a seed Hue (0-360) and Saturation
export function applyMaterialYouSeedHue(hue: number, satBoost = 78): void {
  const root = document.documentElement;
  const h = ((hue % 360) + 360) % 360;
  const secondaryHue = (h + 18) % 360;
  const tertiaryHue = (h + 60) % 360;

  const vars: Record<string, string> = {
    '--md-primary': rgbStr(h, Math.min(92, satBoost + 10), 80),
    '--md-on-primary': rgbStr(h, Math.min(85, satBoost), 16),
    '--md-primary-container': rgbStr(h, Math.min(80, satBoost), 28),
    '--md-on-primary-container': rgbStr(h, 90, 92),
    '--md-secondary': rgbStr(secondaryHue, 40, 76),
    '--md-secondary-container': rgbStr(secondaryHue, 45, 24),
    '--md-on-secondary-container': rgbStr(secondaryHue, 65, 90),
    '--md-tertiary': rgbStr(tertiaryHue, 70, 78),
    '--md-surface': rgbStr(h, 22, 7),
    '--md-surface-dim': rgbStr(h, 24, 5),
    '--md-surface-container-low': rgbStr(h, 22, 10),
    '--md-surface-container': rgbStr(h, 24, 13),
    '--md-surface-container-high': rgbStr(h, 24, 17),
    '--md-surface-container-highest': rgbStr(h, 25, 22),
    '--md-on-surface': rgbStr(h, 20, 94),
    '--md-on-surface-variant': rgbStr(h, 18, 72),
    '--md-outline': rgbStr(h, 16, 46),
    '--md-outline-variant': rgbStr(h, 18, 25),
  };

  Object.entries(vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}

// Extract dominant vibrant hue from album cover URL using offscreen canvas
export async function extractSeedHueFromImage(imageUrl: string): Promise<number | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const proxied = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        canvas.width = 48;
        canvas.height = 48;
        ctx.drawImage(img, 0, 0, 48, 48);
        const data = ctx.getImageData(0, 0, 48, 48).data;

        // Bucket hues weighted by saturation and mid-luminance (Material You vibrancy scoring)
        const hueBuckets = new Array(36).fill(0);
        let bestHue = 265;
        let maxWeight = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);
          if (s < 18 || l < 12 || l > 90) continue;
          const weight = (s / 100) * (1 - Math.abs(l - 50) / 50);
          const bucket = Math.floor(h / 10) % 36;
          hueBuckets[bucket] += weight;
          if (hueBuckets[bucket] > maxWeight) {
            maxWeight = hueBuckets[bucket];
            bestHue = bucket * 10 + 5;
          }
        }
        resolve(bestHue);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = proxied;
  });
}

export const MATERIAL_PRESET_THEMES = [
  { id: 'dynamic', name: 'Dynamic Album Art', hue: null, preview: 'linear-gradient(135deg, #d0bcff, #f472b6, #38bdf8)' },
  { id: 'violet', name: 'M3 Expressive Violet', hue: 265, preview: '#d0bcff' },
  { id: 'rose', name: 'Crimson Rose', hue: 342, preview: '#ffb2c9' },
  { id: 'emerald', name: 'Emerald Mint', hue: 152, preview: '#7ef8b8' },
  { id: 'ocean', name: 'Oceanic Cyan', hue: 196, preview: '#7dd3fc' },
  { id: 'amber', name: 'Solar Amber', hue: 34, preview: '#fdba74' },
];

export function formatCompactNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatSeconds(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
