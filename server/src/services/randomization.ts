import type { DRParams } from "../types";

// Reusing the parameter ranges from the frontend's src/utils/randomization.ts
// but generating full parameter sets for batch rendering

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

export function generateParams(rng: () => number): DRParams {
  const colorTemp = Math.round(random(2500, 10000));

  return {
    position: [
      rng() * 4 - 2,
      rng() * 1,
      rng() * 4 - 2,
    ] as [number, number, number],
    rotation: [
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
    ] as [number, number, number],
    scale: rng() * 0.8 + 0.7,
    lightIntensity: rng() * 2.5 + 0.5,
    lightTemperature: colorTemp,
    cameraPosition: [
      rng() * 4 + 2,
      rng() * 3 + 1,
      rng() * 4 + 2,
    ] as [number, number, number],
    materialColor: COLORS[randomInt(0, COLORS.length - 1)],
  };
}

export function generateSeededRNG(seed: number): () => number {
  // Simple seeded PRNG (Mulberry32)
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDRParams(numViews: number, seed: number): DRParams[] {
  const rng = generateSeededRNG(seed);
  const params: DRParams[] = [];

  for (let i = 0; i < numViews; i++) {
    params.push(generateParams(rng));
  }

  return params;
}

export function colorToRGB(color: string): [number, number, number] {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export function temperatureToRGB(kelvin: number): [number, number, number] {
  // Approximate conversion from color temperature to RGB
  const t = kelvin / 100;

  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = t;
    g = 99.47081 + 0.358357 * g - 0.000299 * g * g * g - 0.012176 * g * g * g * g;
    b = t <= 19 ? 0 : 138.5204 + 1.03837 * t - 0.000299 * t * t * t - 0.012176 * t * t * t * t;
  } else {
    r = 329.17 + 0.16 * t * t * t - 0.012176 * t * t * t * t;
    g = 288.16 + 0.12 * t * t * t - 0.012176 * t * t * t * t;
    b = 255;
  }

  return [
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255,
  ];
}
